import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { classifyErrorType, logJobEvent } from './server/logger.js';
import {
  checkAndIncrementRateLimit,
  getStoreMode,
  storeGetJson,
  storeSetJson,
} from './server/store.js';
import {
  getQueueStats,
  runQueuedAiTask,
  withExponentialBackoff,
} from './server/queue.js';
import {
  createScanJob,
  getScanJob,
  mergeMedicineStep1Results,
  mergeMultiPageReports,
  mergePrescriptionDrafts,
  runParallelPagePipeline,
} from './server/jobs.js';
import {
  apiCorsMiddleware,
  sanitizeStringArray,
  sanitizeUntrustedText,
  UNTRUSTED_DATA_SECURITY_RULE,
  validateImageArray,
  wrapUntrustedData,
} from './server/security.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_SCAN_PAGES = 5;
const MEDICINE_CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours
const TRANSLATION_CACHE_TTL_SEC = 6 * 60 * 60; // 6 hours
const DAILY_WINDOW_SEC = 24 * 60 * 60;
const DAILY_DEVICE_CAP = Math.max(
  10,
  Number.parseInt(process.env.DAILY_DEVICE_CAP || '60', 10) || 60
);
const DAILY_IP_CAP = Math.max(30, DAILY_DEVICE_CAP * 3);
const l1MedicineCache = new Map<string, { value: any; expiresAt: number }>();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Restrict CORS on /api/* and set defensive headers
app.use('/api', apiCorsMiddleware);

// Sensible request size limit for up to 5 compressed JPEGs (~16MB JSON ceiling)
app.use(express.json({ limit: '16mb' }));

// Global per-request server timeout guard (excluding long-lived SSE/static)
app.use('/api', (req, res, next) => {
  res.setTimeout(85000, () => {
    if (!res.headersSent) {
      logJobEvent('warn', {
        step: 'http_request_timeout',
        status: 'timeout',
        details: req.path,
      });
      res.status(503).json({
        success: false,
        error: 'The service took too long to respond. Please try again.',
        isRetryable: true,
      });
    }
  });
  next();
});

function getClientBucketId(req: Request): { ip: string; deviceId: string } {
  const ip = (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  const rawDevice = String(req.headers['x-device-id'] || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  return { ip, deviceId: rawDevice || 'anon' };
}

// Daily cap per device (and IP safety ceiling) across AI & scan endpoints
const dailyDeviceLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const { ip, deviceId } = getClientBucketId(req);
  const devBucket = deviceId !== 'anon' ? `rl:day:dev:${deviceId}` : `rl:day:anon:${ip}`;
  const devCheck = await checkAndIncrementRateLimit(devBucket, DAILY_WINDOW_SEC, DAILY_DEVICE_CAP);
  const ipCheck = await checkAndIncrementRateLimit(`rl:day:ip:${ip}`, DAILY_WINDOW_SEC, DAILY_IP_CAP);

  if (!devCheck.allowed || !ipCheck.allowed) {
    logJobEvent('warn', {
      step: 'daily_cap_blocked',
      status: 'rate_limited',
      errorType: 'rate_limit_429',
      details: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Daily scan limit reached for today. Please try again tomorrow.',
      isRetryable: false,
    });
    return;
  }

  next();
};

// Per-IP + per-device rate limiter (protects AI endpoints from overload)
const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const { ip, deviceId } = getClientBucketId(req);
  const ipCheck = await checkAndIncrementRateLimit(`rl:ip:${ip}`, 60, 40);
  const devCheck =
    deviceId !== 'anon'
      ? await checkAndIncrementRateLimit(`rl:dev:${ip}:${deviceId}`, 60, 20)
      : { allowed: true, count: 0 };

  if (!ipCheck.allowed || !devCheck.allowed) {
    logJobEvent('warn', {
      step: 'rate_limit_blocked',
      status: 'rate_limited',
      errorType: 'rate_limit_429',
      details: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests right now. Please wait a minute and try again.',
      isRetryable: true,
    });
    return;
  }

  dailyDeviceLimiter(req, res, next);
};

// Dedicated tighter limiter for heavy multi-page scan job creation (polling GET /api/jobs/:id is separate)
const scanRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const { ip, deviceId } = getClientBucketId(req);
  const ipCheck = await checkAndIncrementRateLimit(`rl:scan:ip:${ip}`, 60, 15);
  const devCheck =
    deviceId !== 'anon'
      ? await checkAndIncrementRateLimit(`rl:scan:dev:${ip}:${deviceId}`, 60, 10)
      : { allowed: true, count: 0 };

  if (!ipCheck.allowed || !devCheck.allowed) {
    logJobEvent('warn', {
      step: 'scan_rate_limit_blocked',
      status: 'rate_limited',
      errorType: 'rate_limit_429',
      details: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many scans in a short time. Please wait a minute before scanning again.',
      isRetryable: true,
    });
    return;
  }

  dailyDeviceLimiter(req, res, next);
};

const jobPollLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const { ip } = getClientBucketId(req);
  const pollCheck = await checkAndIncrementRateLimit(`rl:poll:ip:${ip}`, 60, 120);
  if (!pollCheck.allowed) {
    res.status(429).json({
      success: false,
      error: 'Too many status checks. Please wait a moment.',
      isRetryable: true,
    });
    return;
  }
  next();
};

// Simple Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    status: 'healthy',
    uptimeSec: Math.round(process.uptime()),
    storeMode: getStoreMode(),
    geminiConfigured: Boolean(ai),
    queue: getQueueStats(),
    cache: {
      medicineMemoryEntries: l1MedicineCache.size,
    },
    timestamp: new Date().toISOString(),
  });
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Candidate models in fallback order - active low-latency models per gemini-api guidelines
const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];

async function callGeminiWithFallback(
  contents: unknown,
  baseConfig: Record<string, unknown>,
  timeoutPerModelMs = 32000
): Promise<string> {
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  let lastError: unknown = null;

  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const modelName = CANDIDATE_MODELS[i];
    const modelTimeoutMs =
      i === 0 ? timeoutPerModelMs : Math.min(timeoutPerModelMs, 24000);

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const modelConfig: Record<string, unknown> = { ...baseConfig };
      if (modelName === 'gemini-3.1-flash-lite') {
        modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (modelName === 'gemini-4-hydrogen') {
        modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`Timeout calling ${modelName}`)),
          modelTimeoutMs
        );
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: modelName,
          contents: contents as any,
          config: modelConfig as any,
        }),
        timeoutPromise,
      ]);

      if (response && response.text) {
        return response.text;
      }
      throw new Error(`Empty response from ${modelName}`);
    } catch (err: unknown) {
      lastError = err;
      logJobEvent('warn', {
        step: `gemini_model_fallback_${modelName}`,
        status: 'fallback',
        errorType: classifyErrorType(err),
      });
      continue;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  throw lastError || new Error('All AI models failed to respond.');
}

function clearImageArray(arr: unknown) {
  if (!Array.isArray(arr)) return;
  for (let i = 0; i < arr.length; i++) {
    arr[i] = '';
  }
  arr.length = 0;
}

async function analyzeSingleReportPage(params: {
  imageBase64: string;
  pageNumber: number;
  totalPages: number;
  age?: number | null;
  gender?: string | null;
  langCode: 'en' | 'hi' | 'or';
}) {
  const { imageBase64, pageNumber, totalPages, age, gender, langCode } = params;
  const targetLanguageName =
    langCode === 'hi'
      ? 'simple Hindi (हिन्दी)'
      : langCode === 'or'
      ? 'simple Odia (ଓଡ଼ିଆ)'
      : 'very simple Class 6 English';

  const inlineParts = toInlineParts([imageBase64], 1);
  const safeAge = age ? sanitizeUntrustedText(age, 12) : 'Not specified';
  const safeGender = gender ? sanitizeUntrustedText(gender, 20) : 'Not specified';
  const userProfileContext = wrapUntrustedData('patient_context', {
    age: safeAge,
    gender: safeGender,
    output_language: targetLanguageName,
    page: `${pageNumber} of ${totalPages}`,
  });

  const systemInstruction = `
You are ReportSamjho, a medical report explainer for patients in India.

STRICT RULES:
1. EXPLAIN reports ONLY. NEVER diagnose, NEVER prescribe medicines or dosages.
2. Output ALL human-readable text (report_type, severity_reason, finding names, short_explanation, symptoms_to_watch, safe_steps, doctor_questions, quality_notes) strictly in ${targetLanguageName}. Keep sentences very short and simple (Class 6 reading level).
3. Keep explanations concise:
   - For normal findings (status = 'normal'), set short_explanation to a 3-5 word phrase (e.g. "Within normal healthy limits.").
   - For abnormal findings (low/high/critical), keep short_explanation to 1 short sentence starting with "Your report shows..." (or equivalent in ${targetLanguageName}), NEVER "You have...".
4. Reference ranges:
   - ALWAYS prioritize the range printed on the report and set range_source = 'lab'.
   - Only if NO range is printed on the report, use standard Indian adult reference ranges (AIIMS/ICMR) adjusted for age (${safeAge}) and gender (${safeGender}), and set range_source = 'general'.
5. Image Quality & Raw Scans:
   - If blurry, dark, unreadable, or not a medical document: set image_quality = 'poor', overall_severity = 'yellow', and quality_notes = 'Photo is not clear. Please retake a clearer photo.' (in ${targetLanguageName}).
   - If raw scan image (X-ray film / MRI / Ultrasound image) with NO written report text: set is_raw_scan_without_text = true, image_quality = 'poor', and quality_notes = 'I can read written reports. Please upload the doctor\\'s report.' (in ${targetLanguageName}).
6. Written Radiology Reports:
   - Extract key findings and map body_region to one of:
     ['head', 'neck_cervical', 'chest_lungs', 'heart', 'abdomen_liver', 'kidney', 'spine_lumbar', 'pelvis', 'shoulder_left', 'shoulder_right', 'knee_left', 'knee_right', 'blood_system', 'general'].
7. Severity & Urgency:
   - overall_severity: 'green' (all normal), 'yellow' (see doctor soon), 'red' (see doctor today). If unsure, mark severity higher.
   - urgency: 'routine' | 'soon' | 'today'.
8. Safe steps & Doctor questions:
   - 3-4 short safe steps (water, rest, avoid heavy lifting, show report to doctor; NO medicines/dosages).
   - 3-4 short simple questions to ask the doctor.
${UNTRUSTED_DATA_SECURITY_RULE}
`;

  const promptText = `
Read medical report page ${pageNumber} of ${totalPages} carefully.
${userProfileContext}
Extract the tests, compare with printed reference ranges (or Indian standard ranges), and return concise structured JSON in ${targetLanguageName}.
`;

  const schemaConfig = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        report_type: { type: Type.STRING },
        patient_age: { type: Type.INTEGER },
        patient_gender: { type: Type.STRING },
        overall_severity: { type: Type.STRING },
        severity_reason: { type: Type.STRING },
        urgency: { type: Type.STRING },
        body_regions_affected: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        findings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              value: { type: Type.STRING },
              unit: { type: Type.STRING },
              reference_range: { type: Type.STRING },
              range_source: { type: Type.STRING },
              status: { type: Type.STRING },
              body_region: { type: Type.STRING },
              short_explanation: { type: Type.STRING },
            },
            required: ['id', 'name', 'value', 'range_source', 'status', 'body_region', 'short_explanation'],
          },
        },
        symptoms_to_watch: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        safe_steps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        doctor_questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        image_quality: { type: Type.STRING },
        quality_notes: { type: Type.STRING },
        is_raw_scan_without_text: { type: Type.BOOLEAN },
      },
      required: [
        'report_type',
        'overall_severity',
        'severity_reason',
        'urgency',
        'body_regions_affected',
        'findings',
        'symptoms_to_watch',
        'safe_steps',
        'doctor_questions',
        'image_quality',
      ],
    },
  };

  const responseText = await callGeminiWithFallback(
    { parts: [...inlineParts, { text: promptText }] },
    schemaConfig,
    32000
  );
  const parsedData = JSON.parse(responseText);

  parsedData.id = 'rep-' + Date.now();
  parsedData.created_at = new Date().toISOString();

  if (!['green', 'yellow', 'red'].includes(parsedData.overall_severity)) {
    parsedData.overall_severity = 'yellow';
  }
  if (!['routine', 'soon', 'today'].includes(parsedData.urgency)) {
    parsedData.urgency = parsedData.overall_severity === 'red' ? 'today' : 'soon';
  }
  if (Array.isArray(parsedData.findings)) {
    parsedData.findings = parsedData.findings.map((f: any, idx: number) => ({
      ...f,
      id: f.id || `f-${idx + 1}`,
    }));
  }

  if (langCode === 'hi' || langCode === 'or') {
    parsedData.translations = {
      [langCode]: {
        report_type: parsedData.report_type,
        severity_reason: parsedData.severity_reason,
        symptoms_to_watch: parsedData.symptoms_to_watch,
        safe_steps: parsedData.safe_steps,
        doctor_questions: parsedData.doctor_questions,
      },
    };
    if (Array.isArray(parsedData.findings)) {
      parsedData.findings = parsedData.findings.map((f: any) => ({
        ...f,
        translations: {
          [langCode]: {
            name: f.name,
            short_explanation: f.short_explanation,
          },
        },
      }));
    }
  }

  return parsedData;
}

// Background Async Job Endpoints (Upload -> immediate jobId -> 2s polling)
app.post('/api/jobs/scan-report', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  try {
    const { age, gender, language } = req.body || {};

    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      clearImageArray(imagesRaw);
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    if (!ai) {
      clearImageArray(imagesRaw);
      res.status(503).json({
        success: false,
        error: 'Service is temporarily unavailable. Please try again later.',
      });
      return;
    }

    const langCode: 'en' | 'hi' | 'or' =
      language === 'hi' || language === 'or' ? language : 'en';

    const payloadContainer = { images: checked.images };
    clearImageArray(imagesRaw);
    if (req.body) req.body.images = [];

    const job = await createScanJob({
      type: 'scan_report',
      language: langCode,
      totalPages: payloadContainer.images.length,
    });

    // Launch background pipeline without awaiting HTTP response
    void runParallelPagePipeline({
      job,
      payloadContainer,
      processSinglePage: (imgBase64, idx, total) =>
        analyzeSingleReportPage({
          imageBase64: imgBase64,
          pageNumber: idx + 1,
          totalPages: total,
          age,
          gender,
          langCode,
        }),
      mergeResults: (pages) => mergeMultiPageReports(pages, langCode),
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      queuePosition: job.queuePosition,
      progressText: job.progressText,
    });
  } catch (err) {
    clearImageArray(imagesRaw);
    logJobEvent('error', {
      step: 'create_scan_report_job',
      status: 'failed',
      errorType: classifyErrorType(err),
    });
    res.status(503).json({
      success: false,
      error: 'Could not start scan right now. Please try again.',
      isRetryable: true,
    });
  }
});

app.get('/api/jobs/:jobId', jobPollLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const jobId = String(req.params.jobId || '');
  if (!/^job-[a-zA-Z0-9_-]{4,64}$/.test(jobId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid scan job reference.',
      isRetryable: false,
    });
    return;
  }
  const job = await getScanJob(jobId);
  if (!job) {
    res.status(404).json({
      success: false,
      error: 'Scan job expired or was not found. Please try again.',
      isRetryable: true,
    });
    return;
  }
  res.json({
    success: true,
    job: {
      id: job.id,
      type: job.type,
      status: job.status,
      totalPages: job.totalPages,
      completedPages: job.completedPages,
      queuePosition: job.queuePosition,
      progressText: job.progressText,
      result: job.status === 'completed' ? job.result : undefined,
      error: job.status === 'failed' ? job.error : undefined,
      isRetryable: job.status === 'failed' ? Boolean(job.isRetryable) : undefined,
    },
  });
});

// Synchronous backwards-compatible endpoint (now backed by concurrency queue + backoff + parallel pages)
app.post('/api/analyze-report', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  try {
    const { age, gender, language } = req.body || {};

    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    if (!ai) {
      res.status(503).json({
        success: false,
        error: 'Service is temporarily unavailable. Please try again.',
      });
      return;
    }

    const langCode: 'en' | 'hi' | 'or' =
      language === 'hi' || language === 'or' ? language : 'en';
    const pages = checked.images;

    const pageResults = await Promise.all(
      pages.map((img, idx) =>
        runQueuedAiTask(() =>
          withExponentialBackoff(
            () =>
              analyzeSingleReportPage({
                imageBase64: img,
                pageNumber: idx + 1,
                totalPages: pages.length,
                age,
                gender,
                langCode,
              }),
            { jobType: 'sync_report', step: `page_${idx + 1}` }
          )
        )
      )
    );

    const report = mergeMultiPageReports(pageResults, langCode);
    res.json({ success: true, report });
  } catch (error: unknown) {
    logJobEvent('error', {
      jobType: 'sync_report',
      step: 'analyze_report_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Service is busy right now. Please tap "Try Again".',
      isRetryable: true,
    });
  } finally {
    clearImageArray(imagesRaw);
  }
});

// Fast on-demand translation endpoint with identical lookup caching & backoff
app.post('/api/translate-report', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { report, targetLanguage } = req.body;

    if (!report || !['en', 'hi', 'or'].includes(targetLanguage)) {
      res.status(400).json({ success: false, error: 'Invalid report or targetLanguage.' });
      return;
    }

    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const langLabel =
      targetLanguage === 'hi' ? 'simple Hindi (हिन्दी)' : targetLanguage === 'or' ? 'simple Odia (ଓଡ଼ିଆ)' : 'very simple Class 6 English';

    const payloadToTranslate = {
      report_type: report.report_type,
      severity_reason: report.severity_reason,
      symptoms_to_watch: report.symptoms_to_watch || [],
      safe_steps: report.safe_steps || [],
      doctor_questions: report.doctor_questions || [],
      findings: (report.findings || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        short_explanation: f.short_explanation,
      })),
    };

    const cacheHash = crypto
      .createHash('sha256')
      .update(`${targetLanguage}:${JSON.stringify(payloadToTranslate)}`)
      .digest('hex')
      .slice(0, 24);
    const cacheKey = `transcache:rep:${cacheHash}`;

    const cached = await storeGetJson<any>(cacheKey);
    if (cached) {
      logJobEvent('info', { step: 'translate_report_cache', cacheHit: true, status: 'ok' });
      res.json({ success: true, translation: cached });
      return;
    }

    const translateConfig = {
      systemInstruction: `Translate the JSON fields inside <untrusted_input> into ${langLabel}. Keep sentences short, simple, and natural for patients. Never diagnose or prescribe. Return strictly matching JSON.\n${UNTRUSTED_DATA_SECURITY_RULE}`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report_type: { type: Type.STRING },
          severity_reason: { type: Type.STRING },
          symptoms_to_watch: { type: Type.ARRAY, items: { type: Type.STRING } },
          safe_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          doctor_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                short_explanation: { type: Type.STRING },
              },
              required: ['id', 'name', 'short_explanation'],
            },
          },
        },
        required: ['report_type', 'severity_reason', 'symptoms_to_watch', 'safe_steps', 'doctor_questions', 'findings'],
      },
    };

    const text = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            wrapUntrustedData('report_to_translate', payloadToTranslate),
            translateConfig,
            22000
          ),
        { jobType: 'translate_report', step: 'translate_report' }
      )
    );
    const translated = JSON.parse(text);
    await storeSetJson(cacheKey, translated, TRANSLATION_CACHE_TTL_SEC);

    res.json({
      success: true,
      translation: translated,
    });
  } catch (error: unknown) {
    logJobEvent('error', {
      step: 'translate_report_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Translation is temporarily busy. Please try again.',
      isRetryable: true,
    });
  }
});

// Helper: Convert validated base64 images (JPEG/PNG/WebP only) to Gemini inlineData parts
function toInlineParts(images: string[], maxCount = 5) {
  return images.slice(0, maxCount).map((imgBase64: string) => {
    const match = imgBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
    if (!match) {
      throw new Error('Invalid image format');
    }
    return {
      inlineData: {
        mimeType: match[1].toLowerCase(),
        data: match[2],
      },
    };
  });
}

function getLangDetails(langInput: unknown) {
  const langCode: 'en' | 'hi' | 'or' =
    langInput === 'hi' || langInput === 'or' ? langInput : 'en';
  const targetLanguageName =
    langCode === 'hi'
      ? 'very simple Hindi (हिन्दी) for a rural user'
      : langCode === 'or'
      ? 'very simple Odia (ଓଡ଼ିଆ) for a rural user'
      : 'very simple English (for a village person who never went to school)';
  return { langCode, targetLanguageName };
}

function getLocalizedPhrases(langCode: 'en' | 'hi' | 'or') {
  if (langCode === 'hi') {
    return {
      looseTablet: 'कृपया पत्ता या डिब्बा स्कैन करें।',
      unclearPhoto: 'फोटो साफ नहीं है। कृपया दोबारा साफ फोटो लें।',
      takeAsDoctor: 'जैसा डॉक्टर ने बताया है वैसे लें।',
      notVerified: 'सत्यापित नहीं। कृपया फार्मासिस्ट से पूछें।',
      couldNotVerify:
        'डेटाबेस में इस दवा की पुष्टि नहीं हो सकी। केवल पैकेट पर लिखी जानकारी दिखाई जा रही है।',
      chatNotSure: 'मैं पक्का नहीं कह सकता। कृपया अपने फार्मासिस्ट या डॉक्टर से पूछें।',
      chatBlocked:
        'मैं खुराक, दवा शुरू/बंद करने या बीमारी बताने की सलाह नहीं दे सकता। कृपया डॉक्टर या फार्मासिस्ट से पूछें।',
    };
  }
  if (langCode === 'or') {
    return {
      looseTablet: 'ଦୟାକରି ପ୍ୟାକେଟ୍ କିମ୍ବା ବକ୍ସ ସ୍କାନ୍ କରନ୍ତୁ।',
      unclearPhoto: 'ଫଟୋ ସ୍ପଷ୍ଟ ନୁହେଁ। ଦୟାକରି ପୁଣି ଫଟୋ ନିଅନ୍ତୁ।',
      takeAsDoctor: 'ଡାକ୍ତର କହିବା ଅନୁସାରେ ନିଅନ୍ତୁ।',
      notVerified: 'ଯାଞ୍ଚ ହୋଇନାହିଁ। ଦୟାକରି ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ପଚାରନ୍ତୁ।',
      couldNotVerify:
        'ତଥ୍ୟଭଣ୍ଡାରରେ ଏହି ଔଷଧ ଯାଞ୍ଚ ହୋଇପାରିଲା ନାହିଁ। କେବଳ ପ୍ୟାକେଟ୍‌ରେ ଲେଖାଥିବା ତଥ୍ୟ ଦେଖାଯାଉଛି।',
      chatNotSure: 'ମୁଁ ନିଶ୍ଚିତ ନୁହେଁ। ଦୟାକରି ଆପଣଙ୍କ ଫାର୍ମାସିଷ୍ଟ ବା ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ।',
      chatBlocked:
        'ମୁଁ ମାତ୍ରା, ଆରମ୍ଭ/ବନ୍ଦ କିମ୍ବା ରୋଗ ନିର୍ଣ୍ଣୟ ପରାମର୍ଶ ଦେଇପାରିବି ନାହିଁ। ଡାକ୍ତର ବା ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ପଚାରନ୍ତୁ।',
    };
  }
  return {
    looseTablet: 'Please scan the strip or box.',
    unclearPhoto: 'Photo not clear. Please retake.',
    takeAsDoctor: 'Take as your doctor told you.',
    notVerified: 'Not verified. Please ask a pharmacist.',
    couldNotVerify:
      'I could not verify this medicine in the trusted database. Showing only what is printed on the pack.',
    chatNotSure: 'I am not sure. Please ask your pharmacist or doctor.',
    chatBlocked:
      'I cannot suggest doses, starting, stopping, or diagnosing. Ask your doctor or pharmacist.',
  };
}

// =========================================================================
// STEP 1 - IDENTIFY (Vision AI reads ONLY printed pack text, never guesses)
// =========================================================================
async function identifyMedicineFromImages(
  images: string[],
  langCode: 'en' | 'hi' | 'or'
) {
  const { targetLanguageName } = getLangDetails(langCode);
  const phrases = getLocalizedPhrases(langCode);
  const packParts = toInlineParts(images, 5);

  const systemInstruction = `
You are Step 1 (OCR & Pack Reader) for ReportSamjho.
Today's date is 2026-11-13 (November 2026).

STRICT STEP 1 RULES:
1. Read ONLY text actually printed on the medicine strip, box, or bottle. NEVER guess or fill from memory.
2. NEVER identify a medicine by tablet/pill shape or color alone. If the photo shows ONLY loose tablets/pills with NO pack/label, set is_loose_tablet_only = true, image_quality = 'poor', confidence = 'low', and quality_notes = "${phrases.looseTablet}".
3. If the photo is blurry, too dark, or partial with no readable medicine name, set image_quality = 'poor', confidence = 'low', and quality_notes = "${phrases.unclearPhoto}".
4. Read the printed active composition / generic salt carefully (e.g., look for "Each tablet/capsule contains:", "Composition:", or small generic salt line printed under the brand name). Return null for any field NOT clearly printed on the pack: brand, salt, strength, manufacturer, batch, expiry, mrp. Add missing field names to unreadable_fields.
5. Set expiry_reliable = true ONLY if the printed expiry date is clearly legible. Compare against 2026-11-13 and set is_expired = true ONLY if clearly before November 2026.
6. printed_warnings: list short exact warnings printed on pack (e.g. "Schedule H", "Red Line", "Do not exceed dose") translated to ${targetLanguageName}.
7. access_level:
   - 'otc' = basic OTC (paracetamol, antacid, ORS, plain vitamins)
   - 'prescription_only' = Schedule H/H1/X, Rx symbol, red vertical line, antibiotics, steroids, BP, sugar, sleeping/anxiety
   - 'ask_doctor' = unsure or moderate pharmacy item
8. risk_flags: include tags from ['steroid', 'strong_antibiotic', 'sleeping_anxiety', 'painkiller_steroid_mix'] ONLY if printed/known class matches.
9. suspicious_flags: include tags from ['missing_batch', 'missing_manufacturer', 'missing_expiry', 'blurry_print'] if pack appears missing legal print.
10. confidence: 'high' (brand + salt clearly printed), 'medium' (only brand or slightly blurry), 'low' (hard to read).
${UNTRUSTED_DATA_SECURITY_RULE}
`;

  const schemaConfig = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        medicine: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING },
            salt: { type: Type.STRING, nullable: true },
            strength: { type: Type.STRING, nullable: true },
            manufacturer: { type: Type.STRING, nullable: true },
            batch: { type: Type.STRING, nullable: true },
            expiry: { type: Type.STRING, nullable: true },
            expiry_reliable: { type: Type.BOOLEAN },
            mrp: { type: Type.STRING, nullable: true },
            printed_warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            access_level: { type: Type.STRING },
            is_expired: { type: Type.BOOLEAN },
          },
          required: ['brand', 'access_level', 'is_expired', 'expiry_reliable'],
        },
        confidence: { type: Type.STRING },
        unreadable_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
        is_loose_tablet_only: { type: Type.BOOLEAN },
        image_quality: { type: Type.STRING },
        quality_notes: { type: Type.STRING },
        risk_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
        suspicious_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: [
        'medicine',
        'confidence',
        'unreadable_fields',
        'is_loose_tablet_only',
        'image_quality',
        'risk_flags',
        'suspicious_flags',
      ],
    },
  };

  const responseText = await callGeminiWithFallback(
    { parts: [...packParts, { text: 'Read ONLY printed text from this medicine pack.' }] },
    schemaConfig,
    36000
  );
  const step1 = JSON.parse(responseText);

  if (!['otc', 'ask_doctor', 'prescription_only'].includes(step1.medicine?.access_level)) {
    step1.medicine.access_level = 'ask_doctor';
  }
  if (!['high', 'medium', 'low'].includes(step1.confidence)) {
    step1.confidence = 'medium';
  }

  return step1;
}

// =========================================================================
// STEP 2 - VERIFY (Lookup generic salt in RxNorm + openFDA Drug Label API)
// =========================================================================
function truncateFdaText(val: unknown, maxLen = 900): string | null {
  if (!val) return null;
  const str = Array.isArray(val) ? val.join(' ') : String(val);
  const cleaned = str.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '...' : cleaned;
}

const INN_TO_USAN_SALT_ALIASES: Record<string, string> = {
  paracetamol: 'acetaminophen',
  salbutamol: 'albuterol',
  'salbutamol sulfate': 'albuterol sulfate',
  'clavulanic acid': 'clavulanate potassium',
  clavulanate: 'clavulanate potassium',
  lignocaine: 'lidocaine',
  adrenaline: 'epinephrine',
  noradrenaline: 'norepinephrine',
  frusemide: 'furosemide',
  'vitamin d3': 'cholecalciferol',
  'vitamin b12': 'cyanocobalamin',
  methylcobalamin: 'cyanocobalamin',
  thyroxine: 'levothyroxine sodium',
  'thyroxine sodium': 'levothyroxine sodium',
  levothyroxine: 'levothyroxine sodium',
  pantoprazole: 'pantoprazole sodium',
  rabeprazole: 'rabeprazole sodium',
  esomeprazole: 'esomeprazole magnesium',
  omeprazole: 'omeprazole',
  atorvastatin: 'atorvastatin calcium',
  metformin: 'metformin hydrochloride',
  glimepiride: 'glimepiride',
  amlodipine: 'amlodipine besylate',
  losartan: 'losartan potassium',
  clopidogrel: 'clopidogrel bisulfate',
  azithromycin: 'azithromycin',
  levocetirizine: 'levocetirizine dihydrochloride',
  cetirizine: 'cetirizine hydrochloride',
  montelukast: 'montelukast sodium',
  diclofenac: 'diclofenac sodium',
  amoxycillin: 'amoxicillin',
  amoxicillin: 'amoxicillin',
};

function cleanSaltTokens(saltInput: string): string[] {
  return saltInput
    .replace(/\(.*?\)/g, ' ')
    .split(/[+,/&]|\b(?:and|with)\b/i)
    .map((part) => {
      let cleaned = part
        .toLowerCase()
        .replace(/\b(?:i\.p\.|b\.p\.|u\.s\.p\.|ph\.eur\.?)\b/gi, ' ')
        .replace(/\d+(?:\.\d+)?\s*(?:mg|mcg|ug|g|gm|ml|l|iu|%|w\/v|w\/w|v\/v)\b/gi, ' ')
        .replace(/\d+(?:\.\d+)?\s*%/gi, ' ')
        .replace(
          /\b(?:ip|bp|usp|sr|xr|er|cr|mr|dt|md|dr|ds|xl|forte|plus|duo|extra|tablet|tablets|tab|tabs|capsule|capsules|cap|caps|syrup|injection|inj|drops|gel|cream|ointment|suspension|solution|equivalent|to|eq)\b/gi,
          ' '
        )
        .replace(/\s+/g, ' ')
        .trim();

      if (INN_TO_USAN_SALT_ALIASES[cleaned]) {
        cleaned = INN_TO_USAN_SALT_ALIASES[cleaned];
      }
      return cleaned;
    })
    .filter((p) => p.length >= 3);
}

async function normalizeSaltViaRxNorm(saltTerm: string): Promise<string> {
  const mappedAlias = INN_TO_USAN_SALT_ALIASES[saltTerm.toLowerCase().trim()] || saltTerm;
  try {
    const rxRes = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(mappedAlias)}`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (rxRes.ok) {
      const rxJson: any = await rxRes.json();
      const rxcui = rxJson?.idGroup?.rxnormId?.[0];
      if (rxcui) {
        const propRes = await fetch(
          `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`,
          { signal: AbortSignal.timeout(4500) }
        );
        if (propRes.ok) {
          const propJson: any = await propRes.json();
          if (propJson?.properties?.name) {
            return String(propJson.properties.name);
          }
        }
      }
    }
  } catch {
    logJobEvent('info', { step: 'rxnorm_lookup_fallback', status: 'skipped' });
  }
  return mappedAlias;
}

async function queryOpenFdaBySalt(saltName: string): Promise<any | null> {
  const queries = [
    `openfda.generic_name:"${saltName}"`,
    `openfda.substance_name:"${saltName}"`,
    `active_ingredient:"${saltName}"`,
  ];

  for (const q of queries) {
    try {
      const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5500) });
      if (res.ok) {
        const json: any = await res.json();
        if (Array.isArray(json?.results) && json.results.length > 0) {
          return json.results[0];
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function verifySaltInDatabase(saltInput: string | null | undefined, brandInput?: string | null) {
  const targetRaw = sanitizeUntrustedText(saltInput || '', 200);
  if (!targetRaw) {
    return {
      verified: false,
      database_name: 'openFDA + RxNorm',
      normalized_salt: sanitizeUntrustedText(brandInput || 'Unknown', 120),
      uses: null,
      warnings: null,
      side_effects: null,
      interactions: null,
      precautions: null,
      dosage_administration: null,
      storage: null,
      pregnancy_lactation: null,
      pediatric_geriatric: null,
    };
  }

  const normalizedSlug = targetRaw.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 80);
  const cacheKey = `medcache:v2:${normalizedSlug}`;

  const memCached = l1MedicineCache.get(cacheKey);
  if (memCached && memCached.expiresAt > Date.now()) {
    logJobEvent('info', { step: 'medicine_db_lookup', cacheHit: true, status: 'ok' });
    return memCached.value;
  }

  const kvCached = await storeGetJson<any>(cacheKey);
  if (kvCached) {
    if (l1MedicineCache.size >= 400) {
      const oldestKey = l1MedicineCache.keys().next().value;
      if (oldestKey) l1MedicineCache.delete(oldestKey);
    }
    l1MedicineCache.set(cacheKey, {
      value: kvCached,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    logJobEvent('info', { step: 'medicine_db_lookup', cacheHit: true, status: 'ok' });
    return kvCached;
  }

  const startedAt = Date.now();
  const tokens = cleanSaltTokens(targetRaw);
  const primaryToken = tokens[0] || targetRaw;
  const normalizedList = await Promise.all(tokens.slice(0, 2).map(normalizeSaltViaRxNorm));
  const combinedNorm = normalizedList.join(' and ');

  // Try combined first (for combos), then primary normalized ingredient, then secondary token
  let label =
    normalizedList.length > 1
      ? await queryOpenFdaBySalt(combinedNorm)
      : null;
  if (!label) {
    label = await queryOpenFdaBySalt(normalizedList[0] || primaryToken);
  }
  if (!label && tokens[0] && tokens[0] !== normalizedList[0]) {
    label = await queryOpenFdaBySalt(tokens[0]);
  }
  if (!label && normalizedList.length > 1) {
    label = await queryOpenFdaBySalt(normalizedList[1]);
  }

  const result = !label
    ? {
        verified: false,
        database_name: 'openFDA + RxNorm',
        normalized_salt: normalizedList[0] || targetRaw,
        uses: null,
        warnings: null,
        side_effects: null,
        interactions: null,
        precautions: null,
        dosage_administration: null,
        storage: null,
        pregnancy_lactation: null,
        pediatric_geriatric: null,
      }
    : {
        verified: true,
        database_name: 'openFDA + RxNorm',
        normalized_salt:
          truncateFdaText(label.openfda?.generic_name?.[0], 140) ||
          normalizedList.join(' + ') ||
          targetRaw,
        uses: truncateFdaText(label.indications_and_usage || label.purpose),
        warnings: truncateFdaText(
          label.boxed_warning || label.warnings_and_cautions || label.warnings
        ),
        side_effects: truncateFdaText(label.adverse_reactions),
        interactions: truncateFdaText(label.drug_interactions),
        precautions: truncateFdaText(label.precautions || label.do_not_use || label.ask_doctor),
        dosage_administration: truncateFdaText(label.dosage_and_administration, 650),
        storage: truncateFdaText(label.storage_and_handling, 400),
        pregnancy_lactation: truncateFdaText(
          label.pregnancy || label.pregnancy_or_breast_feeding || label.nursing_mothers,
          450
        ),
        pediatric_geriatric: truncateFdaText(
          [label.pediatric_use, label.geriatric_use].filter(Boolean).join(' '),
          450
        ),
      };

  const ttlSec = result.verified ? MEDICINE_CACHE_TTL_SEC : 2 * 60 * 60;
  if (l1MedicineCache.size >= 400) {
    const oldestKey = l1MedicineCache.keys().next().value;
    if (oldestKey) l1MedicineCache.delete(oldestKey);
  }
  l1MedicineCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + ttlSec * 1000,
  });
  await storeSetJson(cacheKey, result, ttlSec);

  logJobEvent('info', {
    step: 'medicine_db_lookup',
    cacheHit: false,
    durationMs: Date.now() - startedAt,
    status: result.verified ? 'verified' : 'not_found',
  });

  return result;
}

// =========================================================================
// STEP 3 - EXPLAIN (Grounded ONLY in Step 2 verified data + Step 1 printed pack)
// =========================================================================
async function explainVerifiedMedicineData(params: {
  step1: any;
  verifiedFacts: any;
  problem?: string;
  docImages?: string[];
  langCode: 'en' | 'hi' | 'or';
  age?: number | null;
  gender?: string | null;
  allergies?: string[];
  conditions?: string[];
  isPregnant?: boolean;
}) {
  const {
    step1,
    verifiedFacts,
    problem,
    docImages,
    langCode,
    age,
    gender,
    allergies = [],
    conditions = [],
    isPregnant = false,
  } = params;

  const { targetLanguageName } = getLangDetails(langCode);
  const phrases = getLocalizedPhrases(langCode);
  const extraDocParts = Array.isArray(docImages) && docImages.length > 0 ? toInlineParts(docImages, 3) : [];

  // STRICT SAFETY: If database had NO match, do NOT fill gap with AI memory!
  if (!verifiedFacts.verified) {
    let howToTakePrinted = phrases.takeAsDoctor;
    const safeBrandLabel = sanitizeUntrustedText(step1.medicine?.brand || '', 120);
    if (extraDocParts.length > 0 && ai) {
      try {
        const rxTxt = await callGeminiWithFallback(
          {
            parts: [
              ...extraDocParts,
              {
                text: `Read ONLY written food/timing instructions for the medicine named inside <untrusted_input> if clearly written. Otherwise reply "${phrases.takeAsDoctor}". Max 12 words in ${targetLanguageName}.\n${wrapUntrustedData('medicine_brand', safeBrandLabel)}`,
              },
            ],
          },
          {
            systemInstruction: UNTRUSTED_DATA_SECURITY_RULE,
            responseMimeType: 'text/plain',
          },
          10000
        );
        if (rxTxt?.trim()) howToTakePrinted = rxTxt.trim();
      } catch {
        howToTakePrinted = phrases.takeAsDoctor;
      }
    }

    const printedWarningsList: string[] = Array.isArray(step1.medicine?.printed_warnings)
      ? step1.medicine.printed_warnings
      : [];

    const analysis: any = {
      id: 'med-' + Date.now(),
      created_at: new Date().toISOString(),
      medicine: step1.medicine,
      what_is_it: phrases.notVerified,
      purpose: phrases.notVerified,
      how_it_works: phrases.notVerified,
      how_to_take_as_printed: howToTakePrinted,
      side_effects_common: [],
      side_effects_see_doctor: [],
      time_to_feel_better: phrases.notVerified,
      be_careful_if: printedWarningsList,
      interactions: [],
      storage_instructions: phrases.notVerified,
      dos_donts: printedWarningsList.length > 0 ? printedWarningsList : [phrases.notVerified],
      risk_flags: step1.risk_flags || [],
      suspicious_flags: step1.suspicious_flags || [],
      allergy_condition_warning: '',
      confidence: step1.confidence || 'medium',
      unreadable_fields: step1.unreadable_fields || [],
      is_loose_tablet_only: false,
      image_quality: step1.image_quality || 'ok',
      quality_notes: phrases.couldNotVerify,
      verification_status: 'not_verified',
      verification_database: verifiedFacts.database_name,
      verified_facts: verifiedFacts,
      field_sources: {
        what_is_it: 'not_verified',
        why_used: 'not_verified',
        how_it_works: 'not_verified',
        how_to_take: extraDocParts.length > 0 ? 'printed_on_pack' : 'not_verified',
        side_effects: 'not_verified',
        time_to_feel_better: 'not_verified',
        be_careful_if: printedWarningsList.length > 0 ? 'printed_on_pack' : 'not_verified',
        interactions: 'not_verified',
        storage: 'not_verified',
        dos_donts: printedWarningsList.length > 0 ? 'printed_on_pack' : 'not_verified',
      },
      user_problem: sanitizeUntrustedText(problem, 120) || undefined,
    };
    return analysis;
  }

  // Verified database match exists -> rewrite ONLY verified facts in ultra-simple 12-year-old language
  const safeAllergies = sanitizeStringArray(allergies, 12, 60);
  const safeConditions = sanitizeStringArray(conditions, 12, 60);
  const safeProblem = sanitizeUntrustedText(problem, 120) || 'None';
  const allergyText = safeAllergies.length > 0 ? safeAllergies.join(', ') : 'None';
  const conditionText =
    [...safeConditions, ...(isPregnant ? ['Pregnant or Breastfeeding'] : [])].join(', ') || 'None';

  const systemInstruction = `
You are Step 3 (Plain-Language Translator) for ReportSamjho.
Audience: 12-year-old / rural user with zero medical background.
Output strictly in ${targetLanguageName}.

CRITICAL GROUNDING RULES:
1. Rewrite ONLY from the VERIFIED DATABASE FACTS and PRINTED PACK INFO provided inside <untrusted_input>.
2. NEVER invent or add medical facts that are not in the verified facts!
3. If a section in the verified facts is null/missing (e.g. storage = null, interactions = null), set that output text to "${phrases.notVerified}" (or empty array []) AND set its field_sources entry to "not_verified".
4. Max 10 words per bullet or line! Use very simple words. Explain any medical word in brackets e.g. "germs (bacteria)".
5. "how_to_take": Only mention food-related rules/precautions from verified facts, printed pack warnings, or attached prescription. If dosage isn't verified against an attached prescription, say "${phrases.takeAsDoctor}". NEVER invent dosage numbers or advise start/stop/increase/decrease.
6. "time_to_feel_better": General safe range only, MUST include "can be different for you" and if antibiotic include "finish the full course if your doctor said so". Never promise a cure.
7. "allergy_condition_warning": Check verified warnings/precautions against Patient Allergies (${allergyText}) & Conditions (${conditionText}). Only warn if supported by verified facts! Otherwise "".
8. "field_sources": mark each field as "verified_database", "printed_on_pack", or "not_verified".
${UNTRUSTED_DATA_SECURITY_RULE}
`;

  const promptParts: any[] = [
    {
      text: `
${wrapUntrustedData('printed_pack_info', step1.medicine)}

${wrapUntrustedData(`verified_database_facts_${verifiedFacts.database_name}`, verifiedFacts)}

${wrapUntrustedData('user_context', {
  age: age ? sanitizeUntrustedText(age, 12) : 'Unknown',
  gender: gender ? sanitizeUntrustedText(gender, 20) : 'Unknown',
  problem: safeProblem,
  allergies: allergyText,
  conditions_or_pregnant: conditionText,
})}
${extraDocParts.length > 0 ? '- Attached prescription/report photo(s) below for "how to take" instructions:' : ''}
`,
    },
    ...extraDocParts,
  ];

  const sourceEnumSchema = { type: Type.STRING };

  const schemaConfig = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        what_is_it: { type: Type.STRING },
        purpose: { type: Type.STRING },
        how_it_works: { type: Type.STRING },
        how_to_take_as_printed: { type: Type.STRING },
        side_effects_common: { type: Type.ARRAY, items: { type: Type.STRING } },
        side_effects_see_doctor: { type: Type.ARRAY, items: { type: Type.STRING } },
        time_to_feel_better: { type: Type.STRING },
        be_careful_if: { type: Type.ARRAY, items: { type: Type.STRING } },
        interactions: { type: Type.ARRAY, items: { type: Type.STRING } },
        storage_instructions: { type: Type.STRING },
        dos_donts: { type: Type.ARRAY, items: { type: Type.STRING } },
        allergy_condition_warning: { type: Type.STRING },
        field_sources: {
          type: Type.OBJECT,
          properties: {
            what_is_it: sourceEnumSchema,
            why_used: sourceEnumSchema,
            how_it_works: sourceEnumSchema,
            how_to_take: sourceEnumSchema,
            side_effects: sourceEnumSchema,
            time_to_feel_better: sourceEnumSchema,
            be_careful_if: sourceEnumSchema,
            interactions: sourceEnumSchema,
            storage: sourceEnumSchema,
            dos_donts: sourceEnumSchema,
          },
          required: [
            'what_is_it',
            'why_used',
            'how_it_works',
            'how_to_take',
            'side_effects',
            'time_to_feel_better',
            'be_careful_if',
            'interactions',
            'storage',
            'dos_donts',
          ],
        },
      },
      required: [
        'what_is_it',
        'purpose',
        'how_it_works',
        'how_to_take_as_printed',
        'side_effects_common',
        'side_effects_see_doctor',
        'time_to_feel_better',
        'be_careful_if',
        'interactions',
        'storage_instructions',
        'dos_donts',
        'field_sources',
      ],
    },
  };

  const responseText = await callGeminiWithFallback({ parts: promptParts }, schemaConfig, 35000);
  const explained = JSON.parse(responseText);

  const validSource = (s: string) =>
    s === 'printed_on_pack' || s === 'verified_database' || s === 'not_verified'
      ? s
      : 'verified_database';

  const normalizedSources: Record<string, string> = {};
  if (explained.field_sources) {
    for (const [k, v] of Object.entries(explained.field_sources)) {
      normalizedSources[k] = validSource(String(v));
    }
  }

  const analysis: any = {
    id: 'med-' + Date.now(),
    created_at: new Date().toISOString(),
    medicine: step1.medicine,
    what_is_it: explained.what_is_it,
    purpose: explained.purpose,
    how_it_works: explained.how_it_works,
    how_to_take_as_printed: explained.how_to_take_as_printed,
    side_effects_common: explained.side_effects_common || [],
    side_effects_see_doctor: explained.side_effects_see_doctor || [],
    time_to_feel_better: explained.time_to_feel_better,
    be_careful_if: explained.be_careful_if || [],
    interactions: explained.interactions || [],
    storage_instructions: explained.storage_instructions || phrases.notVerified,
    dos_donts: explained.dos_donts || [],
    risk_flags: step1.risk_flags || [],
    suspicious_flags: step1.suspicious_flags || [],
    allergy_condition_warning: explained.allergy_condition_warning || '',
    confidence: step1.confidence || 'medium',
    unreadable_fields: step1.unreadable_fields || [],
    is_loose_tablet_only: false,
    image_quality: step1.image_quality || 'ok',
    verification_status: 'verified',
    verification_database: verifiedFacts.database_name,
    verified_facts: verifiedFacts,
    field_sources: normalizedSources,
    user_problem: problem || undefined,
  };

  if (langCode === 'hi' || langCode === 'or') {
    analysis.translations = {
      [langCode]: {
        brand: analysis.medicine?.brand,
        salt: analysis.medicine?.salt || undefined,
        what_is_it: analysis.what_is_it,
        purpose: analysis.purpose,
        how_it_works: analysis.how_it_works,
        how_to_take_as_printed: analysis.how_to_take_as_printed,
        side_effects_common: analysis.side_effects_common,
        side_effects_see_doctor: analysis.side_effects_see_doctor,
        time_to_feel_better: analysis.time_to_feel_better,
        be_careful_if: analysis.be_careful_if,
        interactions: analysis.interactions,
        storage_instructions: analysis.storage_instructions,
        dos_donts: analysis.dos_donts,
        allergy_condition_warning: analysis.allergy_condition_warning || undefined,
      },
    };
  }

  return analysis;
}

// Async Job Endpoint: Medicine Pack Identification (supports multi-photo front/back in parallel)
app.post('/api/jobs/medicine-identify', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  try {
    const { language } = req.body || {};
    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      clearImageArray(imagesRaw);
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    if (!ai) {
      clearImageArray(imagesRaw);
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const payloadContainer = { images: checked.images };
    clearImageArray(imagesRaw);
    if (req.body) req.body.images = [];

    const job = await createScanJob({
      type: 'medicine_identify',
      language: langCode,
      totalPages: payloadContainer.images.length,
    });

    void runParallelPagePipeline({
      job,
      payloadContainer,
      processSinglePage: (imgBase64) => identifyMedicineFromImages([imgBase64], langCode),
      mergeResults: (results) => mergeMedicineStep1Results(results),
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      queuePosition: job.queuePosition,
      progressText: job.progressText,
    });
  } catch (err) {
    clearImageArray(imagesRaw);
    logJobEvent('error', {
      step: 'create_medicine_identify_job',
      status: 'failed',
      errorType: classifyErrorType(err),
    });
    res.status(503).json({
      success: false,
      error: 'Could not start medicine scan right now. Please try again.',
      isRetryable: true,
    });
  }
});

// Endpoint: Step 1 Only (Synchronous fallback with queue + backoff)
app.post('/api/medicine/identify', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  try {
    const { language } = req.body;
    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const photos = checked.images;
    const perPhoto = await Promise.all(
      photos.map((img, idx) =>
        runQueuedAiTask(() =>
          withExponentialBackoff(
            () => identifyMedicineFromImages([img], langCode),
            { jobType: 'sync_medicine_identify', step: `photo_${idx + 1}` }
          )
        )
      )
    );
    const step1 = mergeMedicineStep1Results(perPhoto);
    res.json({ success: true, step1 });
  } catch (error) {
    logJobEvent('error', {
      step: 'medicine_identify_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Service is busy right now. Please tap "Try Again".',
      isRetryable: true,
    });
  } finally {
    clearImageArray(imagesRaw);
  }
});

// Endpoint: Step 2 (cached openFDA+RxNorm Verify) + Step 3 (Queued Grounded Explain)
app.post('/api/medicine/verify-and-explain', rateLimiter, async (req: Request, res: Response) => {
  const docImagesRaw = req.body?.docImages;
  try {
    const {
      step1,
      problem,
      language,
      age,
      gender,
      allergies,
      conditions,
      isPregnant,
    } = req.body;

    if (!step1 || !step1.medicine || !step1.medicine.brand) {
      res.status(400).json({ success: false, error: 'Confirmed medicine details are required.' });
      return;
    }

    let validDocImages: string[] | undefined;
    if (Array.isArray(docImagesRaw) && docImagesRaw.length > 0) {
      const checkedDocs = validateImageArray(docImagesRaw, { minCount: 1, maxCount: 3 });
      if (!checkedDocs.ok) {
        res.status(400).json({ success: false, error: checkedDocs.error });
        return;
      }
      validDocImages = checkedDocs.images;
    }

    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const lookupKey = step1.medicine.salt || step1.medicine.brand;
    const verifiedFacts = await verifySaltInDatabase(lookupKey, step1.medicine.brand);
    const medicine = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          explainVerifiedMedicineData({
            step1,
            verifiedFacts,
            problem: sanitizeUntrustedText(problem, 120),
            docImages: validDocImages,
            langCode,
            age,
            gender,
            allergies,
            conditions,
            isPregnant,
          }),
        { jobType: 'medicine_verify_explain', step: 'verify_and_explain' }
      )
    );

    res.json({ success: true, medicine });
  } catch (error) {
    logJobEvent('error', {
      step: 'medicine_verify_explain_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Service is busy right now. Please tap "Try Again".',
      isRetryable: true,
    });
  } finally {
    clearImageArray(docImagesRaw);
  }
});

// Unified 3-step endpoint (backwards-compatible)
app.post('/api/analyze-medicine', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  const docImagesRaw = req.body?.docImages;
  try {
    const { problem, language, age, gender, allergies, conditions, isPregnant } = req.body;
    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      res.status(400).json({ success: false, error: checked.error });
      return;
    }

    let validDocImages: string[] | undefined;
    if (Array.isArray(docImagesRaw) && docImagesRaw.length > 0) {
      const checkedDocs = validateImageArray(docImagesRaw, { minCount: 1, maxCount: 3 });
      if (!checkedDocs.ok) {
        res.status(400).json({ success: false, error: checkedDocs.error });
        return;
      }
      validDocImages = checkedDocs.images;
    }

    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const step1 = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () => identifyMedicineFromImages(checked.images, langCode),
        { jobType: 'unified_medicine', step: 'step1_identify' }
      )
    );
    if (step1.is_loose_tablet_only || (step1.image_quality === 'poor' && !step1.medicine?.brand)) {
      res.json({
        success: true,
        medicine: {
          id: 'med-' + Date.now(),
          created_at: new Date().toISOString(),
          ...step1,
          purpose: '',
          how_it_works: '',
          how_to_take_as_printed: '',
          side_effects_common: [],
          side_effects_see_doctor: [],
          time_to_feel_better: '',
          be_careful_if: [],
          dos_donts: [],
        },
      });
      return;
    }

    const verifiedFacts = await verifySaltInDatabase(
      step1.medicine.salt || step1.medicine.brand,
      step1.medicine.brand
    );
    const medicine = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          explainVerifiedMedicineData({
            step1,
            verifiedFacts,
            problem: sanitizeUntrustedText(problem, 120),
            docImages: validDocImages,
            langCode,
            age,
            gender,
            allergies,
            conditions,
            isPregnant,
          }),
        { jobType: 'unified_medicine', step: 'step3_explain' }
      )
    );
    res.json({ success: true, medicine });
  } catch (error) {
    logJobEvent('error', {
      step: 'analyze_medicine_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Service is busy right now. Please tap "Try Again".',
      isRetryable: true,
    });
  } finally {
    clearImageArray(imagesRaw);
    clearImageArray(docImagesRaw);
  }
});

// Follow-up Question Chat (strictly verified facts only, blocks dosage/diagnosis/stop-start)
app.post('/api/medicine-chat', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { medicine, question, language, healthProfile } = req.body;
    const cleanQuestion = sanitizeUntrustedText(question, 300);
    if (!medicine || !cleanQuestion) {
      res.status(400).json({ success: false, error: 'Medicine and question are required.' });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode, targetLanguageName } = getLangDetails(language);
    const phrases = getLocalizedPhrases(langCode);

    const qLower = cleanQuestion.toLowerCase();
    const unsafeKeywords = [
      'how many mg',
      'increase dose',
      'decrease dose',
      'double dose',
      'can i stop',
      'should i stop',
      'do i have',
      'diagnose',
      'prescribe',
    ];
    if (unsafeKeywords.some((kw) => qLower.includes(kw))) {
      res.json({ success: true, answer: phrases.chatBlocked });
      return;
    }

    const systemInstruction = `
You answer a simple patient question about ONE scanned medicine in ${targetLanguageName}.
STRICT SAFETY RULES:
1. Answer ONLY using the VERIFIED FACTS and PRINTED PACK INFO inside <untrusted_input>. Do NOT use outside medical memory.
2. Keep answer very short (max 2-3 short sentences, simple 12-year-old words).
3. If user asks for dosage numbers/changes, starting/stopping medicine, or diagnosis, reply exactly: "${phrases.chatBlocked}"
4. If the verified data does NOT contain the answer, reply exactly: "${phrases.chatNotSure}"
${UNTRUSTED_DATA_SECURITY_RULE}
`;

    const prompt = `
${wrapUntrustedData('medicine_context', {
  brand: medicine.medicine?.brand,
  salt: medicine.medicine?.salt || 'Unknown',
  printed_pack_info: medicine.medicine,
  verified_facts: medicine.verified_facts || {},
  purpose: medicine.purpose,
  how_to_take_as_printed: medicine.how_to_take_as_printed,
  health_profile: healthProfile || {},
})}
${wrapUntrustedData('user_question', cleanQuestion)}
`;

    const answer = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            prompt,
            { systemInstruction, responseMimeType: 'text/plain' },
            14000
          ),
        { jobType: 'medicine_chat', step: 'medicine_chat' }
      )
    );
    res.json({ success: true, answer: answer.trim() });
  } catch (error) {
    logJobEvent('error', {
      step: 'medicine_chat_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not answer right now. Please ask your pharmacist or doctor.',
      isRetryable: true,
    });
  }
});

// Fast On-Demand Translation for Medicine Result (cached by payload hash)
app.post('/api/translate-medicine', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { medicineAnalysis, targetLanguage } = req.body;

    if (!medicineAnalysis || !['en', 'hi', 'or'].includes(targetLanguage)) {
      res.status(400).json({ success: false, error: 'Invalid medicine data or language.' });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { targetLanguageName } = getLangDetails(targetLanguage);
    const payload = {
      brand: sanitizeUntrustedText(medicineAnalysis.medicine?.brand || '', 120),
      salt: sanitizeUntrustedText(medicineAnalysis.medicine?.salt || '', 180),
      what_is_it: sanitizeUntrustedText(medicineAnalysis.what_is_it || '', 300),
      purpose: sanitizeUntrustedText(medicineAnalysis.purpose || '', 300),
      how_it_works: sanitizeUntrustedText(medicineAnalysis.how_it_works || '', 300),
      how_to_take_as_printed: sanitizeUntrustedText(medicineAnalysis.how_to_take_as_printed || '', 300),
      side_effects_common: sanitizeStringArray(medicineAnalysis.side_effects_common, 10, 120),
      side_effects_see_doctor: sanitizeStringArray(medicineAnalysis.side_effects_see_doctor, 10, 120),
      time_to_feel_better: sanitizeUntrustedText(medicineAnalysis.time_to_feel_better || '', 240),
      be_careful_if: sanitizeStringArray(medicineAnalysis.be_careful_if, 10, 120),
      interactions: sanitizeStringArray(medicineAnalysis.interactions, 10, 120),
      storage_instructions: sanitizeUntrustedText(medicineAnalysis.storage_instructions || '', 240),
      dos_donts: sanitizeStringArray(medicineAnalysis.dos_donts, 10, 120),
      allergy_condition_warning: sanitizeUntrustedText(medicineAnalysis.allergy_condition_warning || '', 240),
    };

    const cacheHash = crypto
      .createHash('sha256')
      .update(`${targetLanguage}:${JSON.stringify(payload)}`)
      .digest('hex')
      .slice(0, 24);
    const cacheKey = `transcache:med:${cacheHash}`;
    const cached = await storeGetJson<any>(cacheKey);
    if (cached) {
      logJobEvent('info', { step: 'translate_medicine_cache', cacheHit: true, status: 'ok' });
      res.json({ success: true, translation: cached });
      return;
    }

    const config = {
      systemInstruction: `Translate the medicine explanation JSON inside <untrusted_input> into ${targetLanguageName}. Keep every line very short (max 10 words), simple words, explain medical terms in brackets. Never invent dosages. Return strict JSON.\n${UNTRUSTED_DATA_SECURITY_RULE}`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brand: { type: Type.STRING },
          salt: { type: Type.STRING },
          what_is_it: { type: Type.STRING },
          purpose: { type: Type.STRING },
          how_it_works: { type: Type.STRING },
          how_to_take_as_printed: { type: Type.STRING },
          side_effects_common: { type: Type.ARRAY, items: { type: Type.STRING } },
          side_effects_see_doctor: { type: Type.ARRAY, items: { type: Type.STRING } },
          time_to_feel_better: { type: Type.STRING },
          be_careful_if: { type: Type.ARRAY, items: { type: Type.STRING } },
          interactions: { type: Type.ARRAY, items: { type: Type.STRING } },
          storage_instructions: { type: Type.STRING },
          dos_donts: { type: Type.ARRAY, items: { type: Type.STRING } },
          allergy_condition_warning: { type: Type.STRING },
        },
        required: [
          'brand',
          'what_is_it',
          'purpose',
          'how_it_works',
          'how_to_take_as_printed',
          'side_effects_common',
          'side_effects_see_doctor',
          'time_to_feel_better',
          'be_careful_if',
          'interactions',
          'storage_instructions',
          'dos_donts',
        ],
      },
    };

    const text = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () => callGeminiWithFallback(wrapUntrustedData('medicine_to_translate', payload), config, 22000),
        { jobType: 'translate_medicine', step: 'translate_medicine' }
      )
    );
    const translation = JSON.parse(text);
    await storeSetJson(cacheKey, translation, TRANSLATION_CACHE_TTL_SEC);
    res.json({ success: true, translation });
  } catch (error) {
    logJobEvent('error', {
      step: 'translate_medicine_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Translation is temporarily busy. Please try again.',
      isRetryable: true,
    });
  }
});

// Connect Medicine + Report + Problem ("Why was this given to me?")
app.post('/api/medicine-report-link', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { medicine, report, userProblem, language } = req.body;
    if (!medicine) {
      res.status(400).json({ success: false, error: 'Medicine data is required.' });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode, targetLanguageName } = getLangDetails(language);
    const noLinkMsg =
      langCode === 'hi'
        ? 'आपकी रिपोर्ट में इसका साफ संबंध नहीं दिखता। कृपया डॉक्टर से पूछें कि यह क्यों दी गई।'
        : langCode === 'or'
        ? 'ଆପଣଙ୍କ ରିପୋର୍ଟରେ ଏହାର ସ୍ପଷ୍ଟ ସମ୍ପର୍କ ଦେଖାଯାଉନାହିଁ। ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ।'
        : 'I cannot see a link in your report. Please ask your doctor why you were given this.';

    const reportSummary = report
      ? {
          report_type: sanitizeUntrustedText(report.report_type, 100),
          overall_severity: report.overall_severity,
          severity_reason: sanitizeUntrustedText(report.severity_reason, 200),
          abnormal_findings: (report.findings || [])
            .filter((f: any) => f.status !== 'normal')
            .slice(0, 20)
            .map((f: any) => `${sanitizeUntrustedText(f.name, 60)}: ${sanitizeUntrustedText(f.value, 30)} (${f.status})`),
        }
      : null;

    const systemInstruction = `
You are ReportSamjho helping a patient understand why a medicine may have been given.
Output strictly in ${targetLanguageName}. Keep lines very short (max 10 words per bullet/sentence).
CRITICAL WORDING RULES:
- NEVER say "your doctor gave this because...".
- ALWAYS use careful wording like "This medicine is commonly used for..." or "This may be related to...".
- NEVER diagnose or prescribe or advise changing dosage.
- If a report is provided and shows NO clear link to this medicine, set connection_found = false and why_given = "${noLinkMsg}".
- If the typed problem and the report findings disagree, set conflict_detected = true, explain both simply, and tell the user to ask their doctor.
${UNTRUSTED_DATA_SECURITY_RULE}
`;

    const prompt = `
${wrapUntrustedData('medicine_and_report', {
  brand: sanitizeUntrustedText(medicine.medicine?.brand, 120),
  salt: sanitizeUntrustedText(medicine.medicine?.salt || 'Unknown salt', 160),
  verified_uses: sanitizeUntrustedText(medicine.verified_facts?.uses || medicine.purpose, 400),
  user_problem: sanitizeUntrustedText(userProblem, 140) || 'None specified',
  report: reportSummary,
})}
Explain clearly and safely.
`;

    const config = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          connection_found: { type: Type.BOOLEAN },
          conflict_detected: { type: Type.BOOLEAN },
          why_given: { type: Type.STRING },
          what_to_do_now: { type: Type.ARRAY, items: { type: Type.STRING } },
          ask_doctor: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['connection_found', 'conflict_detected', 'why_given', 'what_to_do_now', 'ask_doctor'],
      },
    };

    const text = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () => callGeminiWithFallback(prompt, config, 16000),
        { jobType: 'medicine_report_link', step: 'medicine_report_link' }
      )
    );
    const connection = JSON.parse(text);
    res.json({ success: true, connection });
  } catch (error) {
    logJobEvent('error', {
      step: 'medicine_report_link_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not connect medicine and report right now. Please try again.',
      isRetryable: true,
    });
  }
});

async function analyzeSinglePrescriptionPage(
  imageBase64: string,
  langCode: 'en' | 'hi' | 'or'
) {
  const { targetLanguageName } = getLangDetails(langCode);
  const parts = toInlineParts([imageBase64], 1);

  const systemInstruction = `
You read Indian doctor prescriptions carefully. Output text notes in ${targetLanguageName}.
1. If photo is completely dark, blurry, or not a prescription, set image_quality = 'poor' and quality_notes = "${
    langCode === 'hi'
      ? 'फोटो साफ नहीं है। कृपया दोबारा साफ फोटो लें।'
      : langCode === 'or'
      ? 'ଫଟୋ ସ୍ପଷ୍ଟ ନୁହେଁ। ଦୟାକରି ପୁଣି ଫଟୋ ନିଅନ୍ତୁ।'
      : 'Photo not clear. Please retake.'
  }".
2. Extract each medicine line written on the prescription:
   - name: medicine name & strength as written (do not invent if illegible; give closest reading).
   - instructions: dosage/timing ONLY as written on the prescription (e.g. "1 tab after food night", "BD x 5 days" -> "Morning and night after food"). If illegible, say "As written - check with pharmacist".
   - duration: e.g. "5 days" or "Not written".
   - confidence: 'high' | 'medium' | 'low'. Mark 'low' or 'medium' whenever handwriting is messy or ambiguous.
   - needs_check: true if confidence is 'low' or 'medium'.
${UNTRUSTED_DATA_SECURITY_RULE}
`;

  const config = {
    systemInstruction,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        doctor_name: { type: Type.STRING, nullable: true },
        date: { type: Type.STRING, nullable: true },
        image_quality: { type: Type.STRING },
        quality_notes: { type: Type.STRING },
        lines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              instructions: { type: Type.STRING },
              duration: { type: Type.STRING },
              confidence: { type: Type.STRING },
              needs_check: { type: Type.BOOLEAN },
            },
            required: ['id', 'name', 'instructions', 'duration', 'confidence', 'needs_check'],
          },
        },
      },
      required: ['image_quality', 'lines'],
    },
  };

  const text = await callGeminiWithFallback(
    { parts: [...parts, { text: 'Extract all medicine lines from this prescription.' }] },
    config,
    32000
  );
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed.lines)) {
    parsed.lines = parsed.lines.map((l: any, idx: number) => ({
      ...l,
      id: l.id || `rx-line-${idx + 1}`,
      needs_check: l.needs_check || l.confidence === 'low' || l.confidence === 'medium',
    }));
  }
  return parsed;
}

// Async Job Endpoint: Prescription OCR across up to 5 pages in parallel
app.post('/api/jobs/prescription-read', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  try {
    const { language } = req.body || {};
    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      clearImageArray(imagesRaw);
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    if (!ai) {
      clearImageArray(imagesRaw);
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const payloadContainer = { images: checked.images };
    clearImageArray(imagesRaw);
    if (req.body) req.body.images = [];

    const job = await createScanJob({
      type: 'prescription_read',
      language: langCode,
      totalPages: payloadContainer.images.length,
    });

    void runParallelPagePipeline({
      job,
      payloadContainer,
      processSinglePage: (imgBase64) => analyzeSinglePrescriptionPage(imgBase64, langCode),
      mergeResults: (drafts) => mergePrescriptionDrafts(drafts),
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      queuePosition: job.queuePosition,
      progressText: job.progressText,
    });
  } catch (err) {
    clearImageArray(imagesRaw);
    logJobEvent('error', {
      step: 'create_prescription_job',
      status: 'failed',
      errorType: classifyErrorType(err),
    });
    res.status(503).json({
      success: false,
      error: 'Could not start prescription scan right now. Please try again.',
      isRetryable: true,
    });
  }
});

// Analyze Doctor's Prescription (Synchronous fallback backed by parallel page queue)
app.post('/api/analyze-prescription', scanRateLimiter, async (req: Request, res: Response) => {
  const imagesRaw = req.body?.images;
  try {
    const { language } = req.body;
    const checked = validateImageArray(imagesRaw, { minCount: 1, maxCount: MAX_SCAN_PAGES });
    if (!checked.ok) {
      res.status(400).json({ success: false, error: checked.error });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const pages = checked.images;
    const pageDrafts = await Promise.all(
      pages.map((img, idx) =>
        runQueuedAiTask(() =>
          withExponentialBackoff(
            () => analyzeSinglePrescriptionPage(img, langCode),
            { jobType: 'sync_prescription', step: `page_${idx + 1}` }
          )
        )
      )
    );

    const parsed = mergePrescriptionDrafts(pageDrafts);
    res.json({ success: true, prescriptionDraft: parsed });
  } catch (error) {
    logJobEvent('error', {
      step: 'analyze_prescription_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not read prescription right now. Please tap "Try Again".',
      isRetryable: true,
    });
  } finally {
    clearImageArray(imagesRaw);
  }
});

// Explain Confirmed Prescription Lines via 3-step pipeline + Combined Summary
app.post('/api/explain-prescription', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      lines,
      userProblem,
      report,
      language,
      age,
      gender,
      allergies,
      conditions,
      isPregnant,
      doctor_name,
      date,
    } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ success: false, error: 'Confirmed medicine lines are required.' });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const safeLines = lines.slice(0, 12).map((l: any, idx: number) => ({
      id: sanitizeUntrustedText(l.id, 40) || `rx-line-${idx + 1}`,
      name: sanitizeUntrustedText(l.name, 120),
      instructions: sanitizeUntrustedText(l.instructions, 120),
      duration: sanitizeUntrustedText(l.duration, 60),
      confidence: l.confidence,
    }));

    const { langCode, targetLanguageName } = getLangDetails(language);
    const phrases = getLocalizedPhrases(langCode);

    // Step 1b: Identify likely active salt for each prescription line name (text-only lookup helper)
    const saltLookupResText = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            `For these Indian medicine prescription lines inside <untrusted_input>, return ONLY the generic salt name (e.g. "Augmentin 625" -> "Amoxicillin + Clavulanic Acid", "Pan 40" -> "Pantoprazole") plus access_level ('otc'|'ask_doctor'|'prescription_only') and risk_flags (['steroid','strong_antibiotic','sleeping_anxiety','painkiller_steroid_mix']). If unknown salt, set salt = null.\n${wrapUntrustedData('prescription_lines', safeLines)}`,
            {
              systemInstruction: UNTRUSTED_DATA_SECURITY_RULE,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        brand: { type: Type.STRING },
                        salt: { type: Type.STRING, nullable: true },
                        access_level: { type: Type.STRING },
                        risk_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['brand', 'access_level', 'risk_flags'],
                    },
                  },
                },
                required: ['items'],
              },
            },
            14000
          ),
        { jobType: 'explain_prescription', step: 'salt_lookup' }
      )
    );
    const saltMapItems: any[] = JSON.parse(saltLookupResText).items || [];

    // Step 2: Verify each salt in openFDA + RxNorm in parallel (cached)
    const verifiedList = await Promise.all(
      lines.map((line: any, idx: number) => {
        const mapped = saltMapItems[idx] || {};
        return verifySaltInDatabase(mapped.salt || line.name, line.name);
      })
    );

    const reportSummary = report
      ? {
          report_type: report.report_type,
          severity_reason: report.severity_reason,
          abnormal_findings: (report.findings || [])
            .filter((f: any) => f.status !== 'normal')
            .map((f: any) => `${f.name}: ${f.value} (${f.status})`),
        }
      : null;

    // Step 3: Explain each medicine from verified facts + generate combined prescription summary
    const systemInstruction = `
You explain confirmed doctor prescription medicines for a patient in ${targetLanguageName}.
RULES:
1. Very simple words, max 10 words per line. Explain medical terms in brackets.
2. Explain ONLY from the verified_facts provided for each line! If verified_facts.verified is false, write "${phrases.notVerified}" for unverified fields and do not guess.
3. For each medicine, "how_to_take_as_printed" MUST reflect the confirmed prescription line instructions & duration (since it came from the doctor's prescription).
4. Include "why_this_prescription" using careful wording ("commonly used for", "may be related to"). NEVER diagnose.
${UNTRUSTED_DATA_SECURITY_RULE}
`;

    const combinedInput = safeLines.map((line: any, idx: number) => ({
      line,
      salt_info: saltMapItems[idx] || {},
      verified_facts: verifiedList[idx],
    }));

    const prompt = wrapUntrustedData('prescription_context', {
      age: age ? sanitizeUntrustedText(age, 12) : 'Unknown',
      gender: gender ? sanitizeUntrustedText(gender, 20) : 'Unknown',
      allergies: sanitizeStringArray(allergies, 12, 60).join(', ') || 'None',
      conditions: sanitizeStringArray(conditions, 12, 60).join(', ') || 'None',
      pregnant: Boolean(isPregnant),
      user_problem: sanitizeUntrustedText(userProblem, 140) || 'None',
      linked_report: reportSummary,
      medicines_with_verified_facts: combinedInput,
    });

    const config = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          medicines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                what_is_it: { type: Type.STRING },
                purpose: { type: Type.STRING },
                how_it_works: { type: Type.STRING },
                how_to_take_as_printed: { type: Type.STRING },
                side_effects_common: { type: Type.ARRAY, items: { type: Type.STRING } },
                side_effects_see_doctor: { type: Type.ARRAY, items: { type: Type.STRING } },
                time_to_feel_better: { type: Type.STRING },
                be_careful_if: { type: Type.ARRAY, items: { type: Type.STRING } },
                interactions: { type: Type.ARRAY, items: { type: Type.STRING } },
                storage_instructions: { type: Type.STRING },
                dos_donts: { type: Type.ARRAY, items: { type: Type.STRING } },
                allergy_condition_warning: { type: Type.STRING },
              },
              required: [
                'what_is_it',
                'purpose',
                'how_it_works',
                'how_to_take_as_printed',
                'side_effects_common',
                'side_effects_see_doctor',
                'time_to_feel_better',
                'be_careful_if',
                'interactions',
                'storage_instructions',
                'dos_donts',
              ],
            },
          },
          why_this_prescription: {
            type: Type.OBJECT,
            properties: {
              connection_found: { type: Type.BOOLEAN },
              conflict_detected: { type: Type.BOOLEAN },
              why_given: { type: Type.STRING },
              what_to_do_now: { type: Type.ARRAY, items: { type: Type.STRING } },
              ask_doctor: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['connection_found', 'conflict_detected', 'why_given', 'what_to_do_now', 'ask_doctor'],
          },
        },
        required: ['medicines', 'why_this_prescription'],
      },
    };

    const text = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () => callGeminiWithFallback(prompt, config, 32000),
        { jobType: 'explain_prescription', step: 'explain_combined' }
      )
    );
    const parsed = JSON.parse(text);
    const rxId = 'rx-' + Date.now();
    const nowIso = new Date().toISOString();

    const normalizedMedicines = lines.map((line: any, idx: number) => {
      const m = parsed.medicines?.[idx] || {};
      const mapped = saltMapItems[idx] || {};
      const vf = verifiedList[idx];
      const srcType = vf.verified ? 'verified_database' : 'not_verified';

      const medObj: any = {
        id: `${rxId}-med-${idx + 1}`,
        created_at: nowIso,
        medicine: {
          brand: mapped.brand || line.name,
          salt: mapped.salt || (vf.verified ? vf.normalized_salt : null),
          strength: null,
          manufacturer: null,
          batch: null,
          expiry: null,
          expiry_reliable: false,
          mrp: null,
          access_level: ['otc', 'ask_doctor', 'prescription_only'].includes(mapped.access_level)
            ? mapped.access_level
            : 'prescription_only',
          is_expired: false,
        },
        what_is_it: m.what_is_it || phrases.notVerified,
        purpose: m.purpose || phrases.notVerified,
        how_it_works: m.how_it_works || phrases.notVerified,
        how_to_take_as_printed:
          m.how_to_take_as_printed || line.instructions || phrases.takeAsDoctor,
        side_effects_common: m.side_effects_common || [],
        side_effects_see_doctor: m.side_effects_see_doctor || [],
        time_to_feel_better: m.time_to_feel_better || phrases.notVerified,
        be_careful_if: m.be_careful_if || [],
        interactions: m.interactions || [],
        storage_instructions: m.storage_instructions || phrases.notVerified,
        dos_donts: m.dos_donts || [],
        risk_flags: mapped.risk_flags || [],
        suspicious_flags: [],
        allergy_condition_warning: m.allergy_condition_warning || '',
        confidence: line.confidence || 'medium',
        unreadable_fields: [],
        image_quality: 'ok',
        verification_status: vf.verified ? 'verified' : 'not_verified',
        verification_database: vf.database_name,
        verified_facts: vf,
        field_sources: {
          what_is_it: srcType,
          why_used: srcType,
          how_it_works: srcType,
          how_to_take: 'printed_on_pack',
          side_effects: srcType,
          time_to_feel_better: srcType,
          be_careful_if: srcType,
          interactions: srcType,
          storage: srcType,
          dos_donts: srcType,
        },
        user_problem: userProblem || undefined,
        source_tag: 'doctor_prescribed',
        doctor_name: doctor_name || undefined,
        duration_days: line.duration || undefined,
        linked_prescription_id: rxId,
        linked_report_id: report?.id || undefined,
      };

      if (langCode === 'hi' || langCode === 'or') {
        medObj.translations = {
          [langCode]: {
            brand: medObj.medicine.brand,
            salt: medObj.medicine.salt || undefined,
            what_is_it: medObj.what_is_it,
            purpose: medObj.purpose,
            how_it_works: medObj.how_it_works,
            how_to_take_as_printed: medObj.how_to_take_as_printed,
            side_effects_common: medObj.side_effects_common,
            side_effects_see_doctor: medObj.side_effects_see_doctor,
            time_to_feel_better: medObj.time_to_feel_better,
            be_careful_if: medObj.be_careful_if,
            interactions: medObj.interactions,
            storage_instructions: medObj.storage_instructions,
            dos_donts: medObj.dos_donts,
            allergy_condition_warning: medObj.allergy_condition_warning || undefined,
          },
        };
      }
      return medObj;
    });

    const prescriptionRecord = {
      id: rxId,
      created_at: nowIso,
      doctor_name: doctor_name || undefined,
      date: date || undefined,
      lines,
      medicines: normalizedMedicines,
      why_this_prescription: parsed.why_this_prescription,
      linked_report_id: report?.id || undefined,
      user_problem: userProblem || undefined,
      image_quality: 'ok',
    };

    res.json({ success: true, prescription: prescriptionRecord });
  } catch (error) {
    logJobEvent('error', {
      step: 'explain_prescription_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not explain prescription right now. Please try again.',
      isRetryable: true,
    });
  }
});

// Incremental Prescription Line Explanation (for long prescriptions without timeouts)
app.post('/api/explain-prescription-line', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      line,
      userProblem,
      language,
      age,
      gender,
      allergies,
      conditions,
      isPregnant,
      doctor_name,
      rxId,
      reportId,
    } = req.body;

    if (!line || !line.name) {
      res.status(400).json({ success: false, error: 'Prescription line is required.' });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { langCode } = getLangDetails(language);
    const phrases = getLocalizedPhrases(langCode);
    const safeLine = {
      id: sanitizeUntrustedText(line.id, 40) || `rx-line-${Date.now()}`,
      name: sanitizeUntrustedText(line.name, 120),
      instructions: sanitizeUntrustedText(line.instructions, 120),
      duration: sanitizeUntrustedText(line.duration, 60),
      confidence: line.confidence,
    };

    // Quick text lookup for likely generic salt of the Indian prescription brand
    const mapText = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            `For this Indian medicine prescription line inside <untrusted_input>, return ONLY generic salt name (e.g. "Augmentin 625" -> "Amoxicillin + Clavulanic Acid", "Pan 40" -> "Pantoprazole"), access_level ('otc'|'ask_doctor'|'prescription_only'), and risk_flags (['steroid','strong_antibiotic','sleeping_anxiety','painkiller_steroid_mix']). If unknown salt, set salt = null.\n${wrapUntrustedData('prescription_line', safeLine)}`,
            {
              systemInstruction: UNTRUSTED_DATA_SECURITY_RULE,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  brand: { type: Type.STRING },
                  salt: { type: Type.STRING, nullable: true },
                  access_level: { type: Type.STRING },
                  risk_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['brand', 'access_level', 'risk_flags'],
              },
            },
            16000
          ),
        { jobType: 'explain_prescription_line', step: 'salt_lookup' }
      )
    );
    const mapped = JSON.parse(mapText);

    const step1Obj = {
      confidence: line.confidence || 'medium',
      is_loose_tablet_only: false,
      image_quality: 'ok',
      medicine: {
        brand: mapped.brand || line.name,
        salt: mapped.salt || null,
        strength: null,
        manufacturer: null,
        batch: null,
        expiry: null,
        expiry_reliable: false,
        mrp: null,
        printed_warnings: [],
        access_level: ['otc', 'ask_doctor', 'prescription_only'].includes(mapped.access_level)
          ? mapped.access_level
          : 'prescription_only',
        is_expired: false,
      },
      unreadable_fields: [],
      risk_flags: mapped.risk_flags || [],
      suspicious_flags: [],
    };

    const verifiedFacts = await verifySaltInDatabase(mapped.salt || line.name, line.name);
    const medObj = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          explainVerifiedMedicineData({
            step1: step1Obj,
            verifiedFacts,
            problem: userProblem,
            langCode,
            age,
            gender,
            allergies,
            conditions,
            isPregnant,
          }),
        { jobType: 'explain_prescription_line', step: 'explain_line' }
      )
    );

    medObj.id = `${rxId || 'rx-' + Date.now()}-med-${line.id || Date.now()}`;
    medObj.how_to_take_as_printed =
      [line.instructions, line.duration].filter(Boolean).join(' • ') ||
      medObj.how_to_take_as_printed ||
      phrases.takeAsDoctor;
    if (medObj.field_sources) {
      medObj.field_sources.how_to_take = 'printed_on_pack';
    }
    medObj.source_tag = 'doctor_prescribed';
    medObj.doctor_name = doctor_name || undefined;
    medObj.duration_days = line.duration || undefined;
    medObj.linked_prescription_id = rxId || undefined;
    medObj.linked_report_id = reportId || undefined;

    res.json({ success: true, medicine: medObj });
  } catch (error) {
    logJobEvent('error', {
      step: 'explain_prescription_line_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not check this prescription medicine right now.',
      isRetryable: true,
    });
  }
});

// Combined "Why this prescription?" Summary across verified lines
app.post('/api/explain-prescription-summary', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { medicines, userProblem, report, language } = req.body;
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      res.status(400).json({ success: false, error: 'Verified medicines are required.' });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { targetLanguageName } = getLangDetails(language);
    const reportSummary = report
      ? {
          report_type: report.report_type,
          severity_reason: report.severity_reason,
          abnormal_findings: (report.findings || [])
            .filter((f: any) => f.status !== 'normal')
            .map((f: any) => `${f.name}: ${f.value} (${f.status})`),
        }
      : null;

    const summaryInput = medicines.slice(0, 12).map((m: any) => ({
      brand: sanitizeUntrustedText(m.medicine?.brand, 120),
      salt: sanitizeUntrustedText(m.medicine?.salt, 160),
      purpose: sanitizeUntrustedText(m.purpose, 200),
      verified_uses: sanitizeUntrustedText(m.verified_facts?.uses, 300) || null,
    }));

    const config = {
      systemInstruction: `You explain a doctor's prescription as a simple summary in ${targetLanguageName}. Max 10 words per bullet/line. Use careful wording ("commonly used for", "may be related to"). Never diagnose or advise changing dosage.\n${UNTRUSTED_DATA_SECURITY_RULE}`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          connection_found: { type: Type.BOOLEAN },
          conflict_detected: { type: Type.BOOLEAN },
          why_given: { type: Type.STRING },
          what_to_do_now: { type: Type.ARRAY, items: { type: Type.STRING } },
          ask_doctor: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['connection_found', 'conflict_detected', 'why_given', 'what_to_do_now', 'ask_doctor'],
      },
    };

    const text = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            wrapUntrustedData('prescription_summary_input', {
              user_problem: sanitizeUntrustedText(userProblem, 140) || 'None',
              linked_report: reportSummary,
              medicines: summaryInput,
            }),
            config,
            20000
          ),
        { jobType: 'explain_prescription_summary', step: 'summary' }
      )
    );
    res.json({ success: true, why_this_prescription: JSON.parse(text) });
  } catch (error) {
    logJobEvent('error', {
      step: 'explain_prescription_summary_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not summarize prescription right now.',
      isRetryable: true,
    });
  }
});

// Check Verified Drug Interactions across Saved Medicines
app.post('/api/check-medicine-interactions', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { medicines, language } = req.body;
    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      res.json({ success: true, has_warnings: false, warnings: [] });
      return;
    }
    if (!ai) {
      res.status(503).json({ success: false, error: 'Service is temporarily unavailable.' });
      return;
    }

    const { targetLanguageName } = getLangDetails(language);

    const verifiedPairs = await Promise.all(
      medicines.slice(0, 6).map(async (m: any) => {
        const brand = sanitizeUntrustedText(m.brand, 120);
        const salt = sanitizeUntrustedText(m.salt, 160);
        if (m.verified_interactions) {
          return {
            brand,
            salt,
            verified_interactions: sanitizeUntrustedText(m.verified_interactions, 900),
          };
        }
        const vf = await verifySaltInDatabase(salt || brand, brand);
        return {
          brand,
          salt: vf.normalized_salt || salt,
          verified_interactions: vf.interactions || vf.warnings || 'Not verified in openFDA',
        };
      })
    );

    const systemInstruction = `
Check ONLY the verified drug interaction texts inside <untrusted_input> for unsafe combinations among these saved medicines.
Output strictly in ${targetLanguageName}.
RULES:
- Report ONLY interactions supported by the verified openFDA interaction texts or same-salt duplication.
- Max 15 words per warning, very simple language.
- Do NOT scare the patient. Always frame as "These may not be safe together. Ask a pharmacist or doctor."
- NEVER tell user to stop or change medicine.
${UNTRUSTED_DATA_SECURITY_RULE}
`;

    const config = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          has_warnings: { type: Type.BOOLEAN },
          warnings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                medicines: { type: Type.ARRAY, items: { type: Type.STRING } },
                message: { type: Type.STRING },
                severity: { type: Type.STRING },
              },
              required: ['medicines', 'message', 'severity'],
            },
          },
        },
        required: ['has_warnings', 'warnings'],
      },
    };

    const text = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            wrapUntrustedData('verified_medicines', verifiedPairs),
            config,
            14000
          ),
        { jobType: 'check_interactions', step: 'check_interactions' }
      )
    );
    const result = JSON.parse(text);
    res.json({ success: true, ...result });
  } catch (error) {
    logJobEvent('error', {
      step: 'check_medicine_interactions_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: 'Could not check medicine interactions right now.',
      isRetryable: true,
    });
  }
});

// Plain-language "What is this?" Topic Explainer (personalized line OR fallback full explanation)
app.post('/api/explain-topic', rateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      mode,
      topicId,
      topicName,
      value,
      referenceRange,
      status,
      shortExplanation,
      language,
    } = req.body || {};

    const cleanTopic = sanitizeUntrustedText(topicName || topicId, 120);
    if (!cleanTopic) {
      res.status(400).json({ success: false, error: 'Topic name is required.' });
      return;
    }

    const { langCode, targetLanguageName } = getLangDetails(language);
    const uncertainFallback =
      langCode === 'hi'
        ? 'मैं इस हिस्से के बारे में पक्का नहीं कह सकता, कृपया डॉक्टर से पूछें।'
        : langCode === 'or'
        ? 'ମୁଁ ଏହି ଅଂଶ ବିଷୟରେ ନିଶ୍ଚିତ ନୁହେଁ, ଦୟାକରି ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ।'
        : "I'm not sure about this part, please ask a doctor.";

    if (!ai) {
      res.json({
        success: true,
        personalLine: sanitizeUntrustedText(shortExplanation, 160) || uncertainFallback,
      });
      return;
    }

    const safeValue = sanitizeUntrustedText(value, 60);
    const safeRange = sanitizeUntrustedText(referenceRange, 80);
    const safeStatus = sanitizeUntrustedText(status, 24);
    const safeNote = sanitizeUntrustedText(shortExplanation, 180);

    if (mode === 'personal_line') {
      const cacheKey = `explain:line:${crypto
        .createHash('sha256')
        .update(`${langCode}:${cleanTopic}:${safeValue}:${safeStatus}`)
        .digest('hex')
        .slice(0, 24)}`;
      const cached = await storeGetJson<{ personalLine: string }>(cacheKey);
      if (cached?.personalLine) {
        res.json({ success: true, personalLine: cached.personalLine });
        return;
      }

      const systemInstruction = `
You are ReportSamjho, a warm, calm, friendly doctor talking to a rural patient in ${targetLanguageName}.
Write ONE short, reassuring sentence (12-20 words max) explaining what the patient's specific test number means.
RULES:
- Mention the patient's number if provided.
- Very simple village-level words, calm tone, never scary, never preachy.
- NEVER diagnose or prescribe medicines.
- If the test or value is unclear/unrecognized, respond ONLY with: "${uncertainFallback}"
${UNTRUSTED_DATA_SECURITY_RULE}
`;

      const lineText = await runQueuedAiTask(() =>
        withExponentialBackoff(
          () =>
            callGeminiWithFallback(
              wrapUntrustedData('topic_value_context', {
                topic: cleanTopic,
                patient_value: safeValue || 'Not given',
                normal_range: safeRange || 'Not given',
                status: safeStatus || 'unknown',
                existing_note: safeNote || 'None',
              }),
              { systemInstruction, responseMimeType: 'text/plain' },
              12000
            ),
          { jobType: 'explain_topic_line', step: 'explain_topic_line' }
        )
      );

      const personalLine = lineText.replace(/\s+/g, ' ').trim();
      await storeSetJson(cacheKey, { personalLine }, TRANSLATION_CACHE_TTL_SEC);
      res.json({ success: true, personalLine });
      return;
    }

    // mode === 'full' (for topics absent from built-in medicalGlossary.json)
    const fullCacheKey = `explain:full:${crypto
      .createHash('sha256')
      .update(`${langCode}:${cleanTopic.toLowerCase()}`)
      .digest('hex')
      .slice(0, 24)}`;
    const cachedFull = await storeGetJson<any>(fullCacheKey);
    if (cachedFull) {
      res.json({ success: true, explanation: cachedFull });
      return;
    }

    const fullSystemInstruction = `
You are ReportSamjho, explaining a medical test or body term in ${targetLanguageName} to a rural patient.
TONE & STYLE:
- Warm, calm, reassuring, like a friendly doctor talking to a friend. Very simple words.
- Every field must be 1-2 short lines max. Zero emojis.
- NEVER diagnose or prescribe medicines.
- Include a simple everyday analogy (like pipes, trucks, filters, keys, watchmen).
- Provide 3 short steps for a flow diagram using icons ONLY from: ['head','signal','throttle','energy','drop','food','key','lungs','truck','bone','shield','check','filter','heart','pipe','cushion'].
- Set isUncertain = true and analogy = "${uncertainFallback}" if the term is unreadable or too unclear to explain safely.
${UNTRUSTED_DATA_SECURITY_RULE}
`;

    const fullConfig = {
      systemInstruction: fullSystemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          analogy: { type: Type.STRING },
          whatItMeasures: { type: Type.STRING },
          yourResultMeans: { type: Type.STRING },
          feelings: { type: Type.ARRAY, items: { type: Type.STRING } },
          doctorQuestion: { type: Type.STRING },
          flowSteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                icon: { type: Type.STRING },
                label: { type: Type.STRING },
              },
              required: ['icon', 'label'],
            },
          },
          flowHighlightIndex: { type: Type.INTEGER },
          flowCaption: { type: Type.STRING },
          isUncertain: { type: Type.BOOLEAN },
        },
        required: [
          'title',
          'analogy',
          'whatItMeasures',
          'yourResultMeans',
          'feelings',
          'doctorQuestion',
          'flowSteps',
          'flowHighlightIndex',
          'flowCaption',
        ],
      },
    };

    const fullJsonText = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            wrapUntrustedData('topic_full_context', {
              topic: cleanTopic,
              patient_value: safeValue || 'Not given',
              normal_range: safeRange || 'Not given',
              status: safeStatus || 'normal',
              existing_note: safeNote || 'None',
            }),
            fullConfig,
            18000
          ),
        { jobType: 'explain_topic_full', step: 'explain_topic_full' }
      )
    );

    const explanation = JSON.parse(fullJsonText);
    await storeSetJson(fullCacheKey, explanation, 24 * 60 * 60);
    res.json({ success: true, explanation });
  } catch (error) {
    logJobEvent('error', {
      step: 'explain_topic_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: "I'm not sure about this part, please ask a doctor.",
      isRetryable: true,
    });
  }
});

// Ask a Question about the Current Report (typing or voice)
app.post('/api/report-question', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { report, question, language } = req.body || {};
    const cleanQuestion = sanitizeUntrustedText(question, 260);
    if (!report || !cleanQuestion) {
      res.status(400).json({ success: false, error: 'Report and question are required.' });
      return;
    }

    const { langCode, targetLanguageName } = getLangDetails(language);
    const uncertainFallback =
      langCode === 'hi'
        ? 'मैं इस हिस्से के बारे में पक्का नहीं कह सकता, कृपया डॉक्टर से पूछें।'
        : langCode === 'or'
        ? 'ମୁଁ ଏହି ଅଂଶ ବିଷୟରେ ନିଶ୍ଚିତ ନୁହେଁ, ଦୟାକରି ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ।'
        : "I'm not sure about this part, please ask a doctor.";

    if (!ai) {
      res.json({ success: true, answer: uncertainFallback });
      return;
    }

    const reportContext = {
      report_type: sanitizeUntrustedText(report.report_type, 100),
      overall_severity: sanitizeUntrustedText(report.overall_severity, 20),
      severity_reason: sanitizeUntrustedText(report.severity_reason, 200),
      findings: Array.isArray(report.findings)
        ? report.findings.slice(0, 20).map((f: any) => ({
            name: sanitizeUntrustedText(f.name, 80),
            value: sanitizeUntrustedText(f.value, 40),
            unit: sanitizeUntrustedText(f.unit, 20),
            reference_range: sanitizeUntrustedText(f.reference_range, 50),
            status: sanitizeUntrustedText(f.status, 20),
          }))
        : [],
    };

    const systemInstruction = `
You are ReportSamjho, a warm, calm, friendly doctor answering a patient's question about their own medical report in ${targetLanguageName}.
RULES:
1. Reply in 2 to 3 very short, friendly sentences using simple village-level words. Zero emojis.
2. Refer directly to the patient's own test numbers inside <untrusted_input> when relevant.
3. NEVER diagnose a disease and NEVER prescribe medicines or dosages.
4. If the question asks for a diagnosis, medicine dosage, or something not in the report, or if findings look serious/unclear, gently say you are not sure and advise seeing a doctor (e.g. "${uncertainFallback}").
${UNTRUSTED_DATA_SECURITY_RULE}
`;

    const answerText = await runQueuedAiTask(() =>
      withExponentialBackoff(
        () =>
          callGeminiWithFallback(
            `${wrapUntrustedData('patient_report', reportContext)}\n${wrapUntrustedData('patient_question', cleanQuestion)}`,
            { systemInstruction, responseMimeType: 'text/plain' },
            14000
          ),
        { jobType: 'report_question', step: 'report_question' }
      )
    );

    res.json({ success: true, answer: answerText.replace(/\s+/g, ' ').trim() });
  } catch (error) {
    logJobEvent('error', {
      step: 'report_question_failed',
      status: 'failed',
      errorType: classifyErrorType(error),
    });
    res.status(503).json({
      success: false,
      error: "I'm not sure about this part, please ask a doctor.",
      isRetryable: true,
    });
  }
});

// Sanitized API error handler (never exposes raw stack traces or internal errors to clients)
app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({
      success: false,
      error: 'Photos are too large. Please upload up to 5 smaller photos.',
      isRetryable: false,
    });
    return;
  }
  if (err?.type === 'entity.parse.failed' || err?.status === 400) {
    res.status(400).json({
      success: false,
      error: 'Invalid request data. Please try again.',
      isRetryable: false,
    });
    return;
  }
  logJobEvent('error', {
    step: 'api_unhandled_error',
    status: 'failed',
    errorType: classifyErrorType(err),
  });
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again.',
      isRetryable: true,
    });
  }
});

// Mount Vite or static server
async function startServer() {
  const httpServer = http.createServer(app);

  // Sensible HTTP server timeouts for Autoscale / reverse proxy reliability
  httpServer.requestTimeout = 90000;
  httpServer.headersTimeout = 30000;
  httpServer.keepAliveTimeout = 65000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.ENABLE_HMR === 'true' ? undefined : false,
        ws: { server: httpServer },
        watch: process.env.ENABLE_HMR === 'true' ? {} : null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    logJobEvent('info', {
      step: 'server_started',
      status: 'listening',
      details: `http://0.0.0.0:${PORT} storeMode=${getStoreMode()}`,
    });
  });
}

startServer();
