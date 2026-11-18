import { SupportedLanguage } from './translations';

const DEVICE_ID_STORAGE_KEY = 'reportsamjho_device_id';

export function getClientDeviceId(): string {
  try {
    let existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!existing) {
      existing =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, existing);
    }
    return existing;
  } catch {
    return 'browser-device';
  }
}

export interface JobProgressUpdate {
  title: string;
  subtitle?: string;
}

export function getLocalizedUploadText(
  lang: SupportedLanguage,
  kind: 'uploading' | 'queued' | 'timeout' | 'failed',
  percent?: number
): string {
  if (kind === 'uploading') {
    const pct = typeof percent === 'number' ? ` ${percent}%` : '';
    if (lang === 'hi') return `फोटो अपलोड हो रही हैं...${pct}`;
    if (lang === 'or') return `ଫଟୋ ଅପଲୋଡ୍ ହେଉଛି...${pct}`;
    return `Uploading photos...${pct}`;
  }
  if (kind === 'queued') {
    if (lang === 'hi') return 'कतार में प्रतीक्षा हो रही है...';
    if (lang === 'or') return 'ଧାଡ଼ିରେ ଅପେକ୍ଷା କରାଯାଉଛି...';
    return 'Waiting in line...';
  }
  if (kind === 'timeout') {
    if (lang === 'hi') return 'समय समाप्त हो गया। कृपया "दोबारा प्रयास करें" दबाएं।';
    if (lang === 'or') return 'ସମୟ ଶେଷ ହୋଇଗଲା। ଦୟାକରି "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ" ଚିପନ୍ତୁ।';
    return 'Taking too long right now. Please tap "Try Again".';
  }
  if (lang === 'hi') return 'अभी सेवा व्यस्त है। कृपया "दोबारा प्रयास करें" दबाएं।';
  if (lang === 'or') return 'ସେବା ଏବେ ବ୍ୟସ୍ତ ଅଛି। ଦୟାକରି "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ" ଚିପନ୍ତୁ।';
  return 'Could not finish reading right now. Please tap "Try Again".';
}

function uploadJsonWithProgress(
  url: string,
  payload: unknown,
  onUploadPercent: (pct: number) => void,
  timeoutMs = 35000
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Device-Id', getClientDeviceId());
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        onUploadPercent(pct);
      }
    };

    xhr.upload.onload = () => {
      onUploadPercent(100);
    };

    xhr.onload = () => {
      let parsed: any = null;
      try {
        parsed = JSON.parse(xhr.responseText || '{}');
      } catch {
        parsed = null;
      }
      resolve({ status: xhr.status, data: parsed });
    };

    xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
    xhr.ontimeout = () => reject(new Error('UPLOAD_TIMEOUT'));
    xhr.onabort = () => reject(new Error('UPLOAD_ABORTED'));

    try {
      xhr.send(JSON.stringify(payload));
    } catch (err) {
      reject(err);
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitScanJobWithPolling<TResult>(params: {
  endpoint: string;
  payload: Record<string, unknown>;
  language: SupportedLanguage;
  onProgress: (update: JobProgressUpdate) => void;
  overallTimeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<TResult> {
  const {
    endpoint,
    payload,
    language,
    onProgress,
    overallTimeoutMs = 135000,
    pollIntervalMs = 2000,
  } = params;

  onProgress({
    title: getLocalizedUploadText(language, 'uploading', 0),
  });

  let startResponse: { status: number; data: any };
  try {
    startResponse = await uploadJsonWithProgress(
      endpoint,
      payload,
      (pct) => {
        onProgress({
          title: getLocalizedUploadText(language, 'uploading', pct),
        });
      },
      35000
    );
  } catch {
    throw new Error(getLocalizedUploadText(language, 'failed'));
  }

  const { status: httpStatus, data: startData } = startResponse;

  if (httpStatus === 429) {
    throw new Error(
      startData?.error || getLocalizedUploadText(language, 'failed')
    );
  }

  if (httpStatus >= 400 || !startData?.success || !startData?.jobId) {
    // Only surface clean validation errors (like max 5 pages), otherwise safe generic message
    if (httpStatus === 400 && typeof startData?.error === 'string' && !startData.error.includes('Error:')) {
      throw new Error(startData.error);
    }
    throw new Error(getLocalizedUploadText(language, 'failed'));
  }

  const jobId = String(startData.jobId);
  onProgress({
    title:
      startData.status === 'queued'
        ? startData.progressText || getLocalizedUploadText(language, 'queued')
        : startData.progressText || getLocalizedUploadText(language, 'uploading', 100),
  });

  const deadline = Date.now() + overallTimeoutMs;
  let consecutivePollFailures = 0;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);

    try {
      const controller = new AbortController();
      const pollTimeout = setTimeout(() => controller.abort(), 8000);
      const pollRes = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: {
          'X-Device-Id': getClientDeviceId(),
          'Cache-Control': 'no-store',
        },
        signal: controller.signal,
      });
      clearTimeout(pollTimeout);

      const rawText = await pollRes.text();
      let pollJson: any = null;
      try {
        pollJson = JSON.parse(rawText);
      } catch {
        pollJson = null;
      }

      if (!pollRes.ok || !pollJson?.success || !pollJson?.job) {
        if (pollRes.status === 404) {
          throw new Error(getLocalizedUploadText(language, 'failed'));
        }
        consecutivePollFailures++;
        if (consecutivePollFailures >= 4) {
          throw new Error(getLocalizedUploadText(language, 'failed'));
        }
        continue;
      }

      consecutivePollFailures = 0;
      const job = pollJson.job;

      if (job.status === 'queued') {
        onProgress({
          title: job.progressText || getLocalizedUploadText(language, 'queued'),
        });
        continue;
      }

      if (job.status === 'processing') {
        onProgress({
          title:
            job.progressText || getLocalizedUploadText(language, 'uploading', 100),
          subtitle:
            job.totalPages > 1
              ? `${Math.min(job.completedPages || 0, job.totalPages)} / ${job.totalPages}`
              : undefined,
        });
        continue;
      }

      if (job.status === 'completed') {
        return job.result as TResult;
      }

      if (job.status === 'failed') {
        throw new Error(
          typeof job.error === 'string' && job.error.length < 180
            ? job.error
            : getLocalizedUploadText(language, 'failed')
        );
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !== 'Failed to fetch' &&
        err.name !== 'AbortError' &&
        !err.message.includes('NetworkError')
      ) {
        throw err;
      }
      consecutivePollFailures++;
      if (consecutivePollFailures >= 4) {
        throw new Error(getLocalizedUploadText(language, 'failed'));
      }
    }
  }

  throw new Error(getLocalizedUploadText(language, 'timeout'));
}
