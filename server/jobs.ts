import crypto from 'crypto';
import { classifyErrorType, logJobEvent } from './logger.js';
import { getQueueStats, runQueuedAiTask, withExponentialBackoff } from './queue.js';
import { storeGetJson, storeSetJson } from './store.js';

export type JobType = 'scan_report' | 'medicine_identify' | 'prescription_read';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ScanJobState {
  id: string;
  type: JobType;
  status: JobStatus;
  language: 'en' | 'hi' | 'or';
  totalPages: number;
  completedPages: number;
  queuePosition: number;
  progressText: string;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
  isRetryable?: boolean;
}

const JOB_TTL_SECONDS = 900; // 15 minutes

export function getFriendlyJobError(
  lang: 'en' | 'hi' | 'or',
  err: unknown
): { message: string; isRetryable: boolean } {
  const errType = classifyErrorType(err);
  if (errType === 'bad_request') {
    return {
      isRetryable: false,
      message:
        lang === 'hi'
          ? 'कृपया साफ फोटो चुनें (अधिकतम 5 पेज)।'
          : lang === 'or'
          ? 'ଦୟାକରି ସ୍ପଷ୍ଟ ଫଟୋ ବାଛନ୍ତୁ (ସର୍ବାଧିକ 5 ପୃଷ୍ଠା)।'
          : 'Please upload up to 5 clear photos or PDF pages.',
    };
  }
  if (errType === 'rate_limit_429' || errType === 'service_unavailable_503' || errType === 'timeout') {
    return {
      isRetryable: true,
      message:
        lang === 'hi'
          ? 'अभी सिस्टम व्यस्त है। कृपया फिर से प्रयास करें।'
          : lang === 'or'
          ? 'ସିଷ୍ଟମ୍ ଏବେ ବ୍ୟସ୍ତ ଅଛି। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।'
          : 'Service is busy right now. Please try again.',
    };
  }
  return {
    isRetryable: true,
    message:
      lang === 'hi'
        ? 'स्कैन पूरा नहीं हो सका। कृपया साफ फोटो के साथ फिर से प्रयास करें।'
        : lang === 'or'
        ? 'ସ୍କାନ୍ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।'
        : 'Could not read all pages clearly. Please try again.',
  };
}

export function getLocalizedProgressText(
  lang: 'en' | 'hi' | 'or',
  kind: 'queued' | 'reading_page' | 'combining',
  page?: number,
  totalPages?: number,
  queuePosition?: number
): string {
  if (kind === 'queued') {
    if (lang === 'hi') {
      return queuePosition && queuePosition > 1
        ? `कतार में प्रतीक्षा हो रही है (${queuePosition})...`
        : 'कतार में प्रतीक्षा हो रही है...';
    }
    if (lang === 'or') {
      return queuePosition && queuePosition > 1
        ? `ଧାଡ଼ିରେ ଅପେକ୍ଷା କରାଯାଉଛି (${queuePosition})...`
        : 'ଧାଡ଼ିରେ ଅପେକ୍ଷା କରାଯାଉଛି...';
    }
    return queuePosition && queuePosition > 1
      ? `Waiting in line (${queuePosition})...`
      : 'Waiting in line...';
  }
  if (kind === 'combining') {
    if (lang === 'hi') return 'सभी पेज जोड़े जा रहे हैं...';
    if (lang === 'or') return 'ସବୁ ପୃଷ୍ଠା ମିଶାଯାଉଛି...';
    return 'Putting pages together...';
  }
  const p = Math.max(1, page || 1);
  const total = Math.max(1, totalPages || 1);
  if (lang === 'hi') return `पेज ${p} / ${total} पढ़ा जा रहा है...`;
  if (lang === 'or') return `ପୃଷ୍ଠା ${p} / ${total} ପଢ଼ାଯାଉଛି...`;
  return `Reading page ${p} of ${total}...`;
}

export async function createScanJob(params: {
  type: JobType;
  language: 'en' | 'hi' | 'or';
  totalPages: number;
}): Promise<ScanJobState> {
  const qStats = getQueueStats();
  const isBusy = qStats.active >= qStats.maxConcurrency || qStats.waiting > 0;
  const initialQueuePos = isBusy ? qStats.waiting + 1 : 0;
  const now = new Date().toISOString();

  const job: ScanJobState = {
    id: `job-${crypto.randomUUID()}`,
    type: params.type,
    status: isBusy ? 'queued' : 'processing',
    language: params.language,
    totalPages: params.totalPages,
    completedPages: 0,
    queuePosition: initialQueuePos,
    progressText: isBusy
      ? getLocalizedProgressText(params.language, 'queued', 1, params.totalPages, initialQueuePos)
      : getLocalizedProgressText(params.language, 'reading_page', 1, params.totalPages),
    createdAt: now,
    updatedAt: now,
  };

  await storeSetJson(`job:${job.id}`, job, JOB_TTL_SECONDS);
  logJobEvent('info', {
    jobId: job.id,
    jobType: job.type,
    step: 'job_created',
    status: job.status,
    totalPages: job.totalPages,
    queueActive: qStats.active,
    queueWaiting: qStats.waiting,
  });

  return job;
}

export async function getScanJob(jobId: string): Promise<ScanJobState | null> {
  if (!jobId || !jobId.startsWith('job-')) return null;
  return await storeGetJson<ScanJobState>(`job:${jobId}`);
}

export async function updateScanJob(
  job: ScanJobState,
  patch: Partial<ScanJobState>
): Promise<ScanJobState> {
  const updated: ScanJobState = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await storeSetJson(`job:${job.id}`, updated, JOB_TTL_SECONDS);
  return updated;
}

/**
 * Merges multi-page analyzed ReportAnalysis fragments into a single clean JSON object.
 */
export function mergeMultiPageReports(
  pageResults: any[],
  langCode: 'en' | 'hi' | 'or'
): any {
  const validPages = pageResults.filter(Boolean);
  if (validPages.length === 1) {
    return validPages[0];
  }

  const severityRank: Record<string, number> = { green: 1, yellow: 2, red: 3 };
  const urgencyRank: Record<string, number> = { routine: 1, soon: 2, today: 3 };

  let highestSeverity: 'green' | 'yellow' | 'red' = 'green';
  let highestUrgency: 'routine' | 'soon' | 'today' = 'routine';
  let chosenReason = '';
  let chosenReportType = '';
  let chosenAge: number | undefined;
  let chosenGender: string | undefined;

  const seenFindings = new Set<string>();
  const mergedFindings: any[] = [];
  const mergedRegions = new Set<string>();
  const mergedSymptoms = new Set<string>();
  const mergedSafeSteps = new Set<string>();
  const mergedQuestions = new Set<string>();

  for (const page of validPages) {
    const sev = ['green', 'yellow', 'red'].includes(page.overall_severity)
      ? (page.overall_severity as 'green' | 'yellow' | 'red')
      : 'yellow';
    if (severityRank[sev] >= severityRank[highestSeverity]) {
      if (severityRank[sev] > severityRank[highestSeverity] || !chosenReason) {
        chosenReason = page.severity_reason || chosenReason;
      }
      highestSeverity = sev;
    }

    const urg = ['routine', 'soon', 'today'].includes(page.urgency)
      ? (page.urgency as 'routine' | 'soon' | 'today')
      : 'soon';
    if (urgencyRank[urg] > urgencyRank[highestUrgency]) {
      highestUrgency = urg;
    }

    if (!chosenReportType && page.report_type) {
      chosenReportType = page.report_type;
    }
    if (!chosenAge && typeof page.patient_age === 'number') {
      chosenAge = page.patient_age;
    }
    if (!chosenGender && page.patient_gender) {
      chosenGender = page.patient_gender;
    }

    for (const region of page.body_regions_affected || []) {
      if (region) mergedRegions.add(String(region));
    }
    for (const s of page.symptoms_to_watch || []) {
      if (s && mergedSymptoms.size < 6) mergedSymptoms.add(String(s).trim());
    }
    for (const step of page.safe_steps || []) {
      if (step && mergedSafeSteps.size < 6) mergedSafeSteps.add(String(step).trim());
    }
    for (const q of page.doctor_questions || []) {
      if (q && mergedQuestions.size < 6) mergedQuestions.add(String(q).trim());
    }

    for (const f of page.findings || []) {
      if (!f || !f.name) continue;
      const dedupeKey = `${String(f.name).toLowerCase().trim()}|${String(f.value || '').toLowerCase().trim()}`;
      if (seenFindings.has(dedupeKey)) continue;
      seenFindings.add(dedupeKey);
      mergedFindings.push({
        ...f,
        id: `f-${mergedFindings.length + 1}`,
      });
    }
  }

  // Re-evaluate severity if findings have critical/high/low entries
  const hasAnyFindings = mergedFindings.length > 0;
  const anyPagePoor = validPages.every((p) => p.image_quality === 'poor');
  const anyRawScan = validPages.every((p) => p.is_raw_scan_without_text);

  const merged: any = {
    id: 'rep-' + Date.now(),
    created_at: new Date().toISOString(),
    report_type: chosenReportType || 'Medical Report',
    ...(chosenAge ? { patient_age: chosenAge } : {}),
    ...(chosenGender ? { patient_gender: chosenGender } : {}),
    overall_severity: highestSeverity,
    severity_reason: chosenReason || 'Please review your findings below.',
    urgency: highestUrgency,
    body_regions_affected:
      mergedRegions.size > 0 ? Array.from(mergedRegions) : ['general'],
    findings: mergedFindings,
    symptoms_to_watch: Array.from(mergedSymptoms),
    safe_steps: Array.from(mergedSafeSteps),
    doctor_questions: Array.from(mergedQuestions),
    image_quality: hasAnyFindings ? 'ok' : anyPagePoor ? 'poor' : 'ok',
    quality_notes: !hasAnyFindings ? validPages[0]?.quality_notes : undefined,
    is_raw_scan_without_text: !hasAnyFindings && anyRawScan ? true : false,
  };

  if (langCode === 'hi' || langCode === 'or') {
    merged.translations = {
      [langCode]: {
        report_type: merged.report_type,
        severity_reason: merged.severity_reason,
        symptoms_to_watch: merged.symptoms_to_watch,
        safe_steps: merged.safe_steps,
        doctor_questions: merged.doctor_questions,
      },
    };
    merged.findings = merged.findings.map((f: any) => ({
      ...f,
      translations: {
        [langCode]: {
          name: f.name,
          short_explanation: f.short_explanation,
        },
      },
    }));
  }

  return merged;
}

/**
 * Merges multi-photo medicine Step 1 OCR outputs (e.g. front + back of strip).
 */
export function mergeMedicineStep1Results(results: any[]): any {
  const valid = results.filter(Boolean);
  if (valid.length === 1) return valid[0];

  const accessRank: Record<string, number> = {
    otc: 1,
    ask_doctor: 2,
    prescription_only: 3,
  };
  const confRank: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  const pickFirstNonEmpty = (getter: (r: any) => string | null | undefined) => {
    for (const r of valid) {
      const v = getter(r);
      if (v && String(v).trim() && String(v).trim().toLowerCase() !== 'unknown') {
        return String(v).trim();
      }
    }
    return null;
  };

  const brand =
    pickFirstNonEmpty((r) => r.medicine?.brand) || valid[0]?.medicine?.brand || 'Unknown';
  const salt = pickFirstNonEmpty((r) => r.medicine?.salt);
  const strength = pickFirstNonEmpty((r) => r.medicine?.strength);
  const manufacturer = pickFirstNonEmpty((r) => r.medicine?.manufacturer);
  const batch = pickFirstNonEmpty((r) => r.medicine?.batch);
  const expiry = pickFirstNonEmpty((r) => r.medicine?.expiry);
  const mrp = pickFirstNonEmpty((r) => r.medicine?.mrp);

  const expiryReliable = valid.some((r) => Boolean(r.medicine?.expiry_reliable));
  const isExpired = valid.some((r) => Boolean(r.medicine?.is_expired));

  let bestAccess: 'otc' | 'ask_doctor' | 'prescription_only' = 'otc';
  for (const r of valid) {
    const al = r.medicine?.access_level;
    if (accessRank[al] > accessRank[bestAccess]) {
      bestAccess = al;
    }
  }

  let bestConf: 'low' | 'medium' | 'high' = 'low';
  for (const r of valid) {
    const c = r.confidence;
    if (confRank[c] > confRank[bestConf]) {
      bestConf = c;
    }
  }
  if (brand !== 'Unknown' && salt && bestConf === 'low') {
    bestConf = 'medium';
  }

  const printedWarnings = Array.from(
    new Set(
      valid.flatMap((r) =>
        Array.isArray(r.medicine?.printed_warnings) ? r.medicine.printed_warnings : []
      )
    )
  );
  const riskFlags = Array.from(
    new Set(valid.flatMap((r) => (Array.isArray(r.risk_flags) ? r.risk_flags : [])))
  );

  const suspiciousFlags: string[] = [];
  if (!batch) suspiciousFlags.push('missing_batch');
  if (!manufacturer) suspiciousFlags.push('missing_manufacturer');
  if (!expiry) suspiciousFlags.push('missing_expiry');

  const unreadableFields: string[] = [];
  if (!salt) unreadableFields.push('salt');
  if (!strength) unreadableFields.push('strength');
  if (!expiry) unreadableFields.push('expiry');

  const isLooseTabletOnly = valid.every((r) => Boolean(r.is_loose_tablet_only));
  const anyOkQuality = valid.some((r) => r.image_quality === 'ok');

  return {
    medicine: {
      brand,
      salt,
      strength,
      manufacturer,
      batch,
      expiry,
      expiry_reliable: expiryReliable,
      mrp,
      printed_warnings: printedWarnings,
      access_level: bestAccess,
      is_expired: isExpired,
    },
    confidence: bestConf,
    unreadable_fields: unreadableFields,
    is_loose_tablet_only: isLooseTabletOnly,
    image_quality: anyOkQuality || brand !== 'Unknown' ? 'ok' : 'poor',
    quality_notes: brand === 'Unknown' ? valid[0]?.quality_notes : undefined,
    risk_flags: riskFlags,
    suspicious_flags: suspiciousFlags,
  };
}

/**
 * Merges multi-page prescription OCR drafts into sequential medicine lines.
 */
export function mergePrescriptionDrafts(pageDrafts: any[]): any {
  const valid = pageDrafts.filter(Boolean);
  if (valid.length === 1) return valid[0];

  let doctorName: string | null = null;
  let date: string | null = null;
  const mergedLines: any[] = [];

  for (const draft of valid) {
    if (!doctorName && draft.doctor_name) doctorName = draft.doctor_name;
    if (!date && draft.date) date = draft.date;
    for (const line of draft.lines || []) {
      mergedLines.push({
        ...line,
        id: `rx-line-${mergedLines.length + 1}`,
        needs_check: Boolean(
          line.needs_check || line.confidence === 'low' || line.confidence === 'medium'
        ),
      });
    }
  }

  return {
    doctor_name: doctorName,
    date,
    image_quality: mergedLines.length > 0 ? 'ok' : valid[0]?.image_quality || 'poor',
    quality_notes: mergedLines.length === 0 ? valid[0]?.quality_notes : undefined,
    lines: mergedLines,
  };
}

/**
 * Executes page tasks in parallel through the shared concurrency queue with retries,
 * updating job progress safely and freeing the images array immediately after completion.
 */
export async function runParallelPagePipeline<TPage, TMerged>(params: {
  job: ScanJobState;
  payloadContainer: { images: string[] };
  processSinglePage: (imageBase64: string, pageIndex: number, totalPages: number) => Promise<TPage>;
  mergeResults: (pageOutputs: TPage[]) => TMerged;
}): Promise<void> {
  const { payloadContainer, processSinglePage, mergeResults } = params;
  let latestJob = { ...params.job };
  const totalPages = payloadContainer.images.length;
  const jobStartedAt = Date.now();
  let completedCount = 0;
  let activePagesStarted = 0;
  let persistChain: Promise<void> = Promise.resolve();

  const enqueueUpdate = (patch: Partial<ScanJobState>) => {
    latestJob = {
      ...latestJob,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const snapshot = { ...latestJob };
    persistChain = persistChain
      .then(() => storeSetJson(`job:${snapshot.id}`, snapshot, JOB_TTL_SECONDS))
      .catch(() => {});
    return persistChain;
  };

  try {
    const pagePromises = payloadContainer.images.map((img, idx) =>
      runQueuedAiTask(
        () => {
          activePagesStarted++;
          if (completedCount === 0 && latestJob.status === 'queued') {
            enqueueUpdate({
              status: 'processing',
              queuePosition: 0,
              progressText: getLocalizedProgressText(
                latestJob.language,
                'reading_page',
                1,
                totalPages
              ),
            });
          }
          return withExponentialBackoff(
            () => processSinglePage(img, idx, totalPages),
            {
              jobId: latestJob.id,
              jobType: latestJob.type,
              step: `page_${idx + 1}`,
            }
          );
        },
        {
          jobId: latestJob.id,
          onQueuePosition: (position) => {
            if (activePagesStarted === 0) {
              enqueueUpdate({
                status: 'queued',
                queuePosition: position,
                progressText: getLocalizedProgressText(
                  latestJob.language,
                  'queued',
                  1,
                  totalPages,
                  position
                ),
              });
            }
          },
        }
      ).then(async (pageResult) => {
        completedCount++;
        const nextPage = Math.min(totalPages, completedCount + 1);
        await enqueueUpdate({
          status: 'processing',
          queuePosition: 0,
          completedPages: completedCount,
          progressText:
            completedCount >= totalPages && totalPages > 1
              ? getLocalizedProgressText(latestJob.language, 'combining')
              : getLocalizedProgressText(
                  latestJob.language,
                  'reading_page',
                  nextPage,
                  totalPages
                ),
        });
        return pageResult;
      })
    );

    const pageResults = await Promise.all(pagePromises);
    const mergedResult = mergeResults(pageResults);

    await enqueueUpdate({
      status: 'completed',
      queuePosition: 0,
      completedPages: totalPages,
      progressText: '',
      result: mergedResult,
    });

    logJobEvent('info', {
      jobId: latestJob.id,
      jobType: latestJob.type,
      step: 'job_completed',
      durationMs: Date.now() - jobStartedAt,
      status: 'completed',
      totalPages,
    });
  } catch (err) {
    const errType = classifyErrorType(err);
    const friendly = getFriendlyJobError(latestJob.language, err);

    await enqueueUpdate({
      status: 'failed',
      queuePosition: 0,
      error: friendly.message,
      isRetryable: friendly.isRetryable,
    });

    logJobEvent('error', {
      jobId: latestJob.id,
      jobType: latestJob.type,
      step: 'job_failed',
      durationMs: Date.now() - jobStartedAt,
      status: 'failed',
      errorType: errType,
      totalPages,
    });
  } finally {
    // Free image buffers immediately after every job succeeds or fails
    for (let i = 0; i < payloadContainer.images.length; i++) {
      payloadContainer.images[i] = '';
    }
    payloadContainer.images.length = 0;
  }
}
