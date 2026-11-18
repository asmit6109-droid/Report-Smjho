import { classifyErrorType, logJobEvent } from './logger.js';

const parsedConcurrency = parseInt(process.env.AI_CONCURRENCY_LIMIT || '4', 10);
export const MAX_AI_CONCURRENCY = Number.isFinite(parsedConcurrency)
  ? Math.max(2, Math.min(5, parsedConcurrency))
  : 4;

interface QueuedTask<T> {
  jobId?: string;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
  onQueuePosition?: (position: number) => void;
}

let activeAiCalls = 0;
const waitingQueue: QueuedTask<any>[] = [];

export function getQueueStats() {
  return {
    active: activeAiCalls,
    waiting: waitingQueue.length,
    maxConcurrency: MAX_AI_CONCURRENCY,
  };
}

function notifyWaitingPositions() {
  waitingQueue.forEach((task, idx) => {
    if (task.onQueuePosition) {
      try {
        task.onQueuePosition(idx + 1);
      } catch {
        // ignore listener failure
      }
    }
  });
}

function pumpQueue() {
  while (activeAiCalls < MAX_AI_CONCURRENCY && waitingQueue.length > 0) {
    const next = waitingQueue.shift();
    if (!next) break;
    notifyWaitingPositions();
    executeTask(next);
  }
}

function executeTask<T>(task: QueuedTask<T>) {
  activeAiCalls++;
  Promise.resolve()
    .then(() => task.run())
    .then(
      (result) => {
        activeAiCalls = Math.max(0, activeAiCalls - 1);
        pumpQueue();
        task.resolve(result);
      },
      (err) => {
        activeAiCalls = Math.max(0, activeAiCalls - 1);
        pumpQueue();
        task.reject(err);
      }
    );
}

/**
 * Runs an AI task respecting the global MAX_AI_CONCURRENCY limit (3-5).
 * Extra calls wait in FIFO order and notify callers of their queue position.
 */
export function runQueuedAiTask<T>(
  taskFn: () => Promise<T>,
  options?: {
    jobId?: string;
    onQueuePosition?: (position: number) => void;
  }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const task: QueuedTask<T> = {
      jobId: options?.jobId,
      run: taskFn,
      resolve,
      reject,
      onQueuePosition: options?.onQueuePosition,
    };

    if (activeAiCalls < MAX_AI_CONCURRENCY) {
      executeTask(task);
    } else {
      waitingQueue.push(task);
      const pos = waitingQueue.length;
      if (options?.onQueuePosition) {
        options.onQueuePosition(pos);
      }
      logJobEvent('info', {
        jobId: options?.jobId,
        step: 'ai_queued',
        status: 'queued',
        queueActive: activeAiCalls,
        queueWaiting: waitingQueue.length,
      });
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableAiError(err: unknown): boolean {
  const errType = classifyErrorType(err);
  if (
    errType === 'rate_limit_429' ||
    errType === 'service_unavailable_503' ||
    errType === 'timeout' ||
    errType === 'network' ||
    errType === 'invalid_json'
  ) {
    return true;
  }
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return msg.includes('empty response') || msg.includes('no text');
}

/**
 * Retries failed/timed-out/rate-limited AI calls with exponential backoff:
 * 2s -> 4s -> 8s (max 3 retries = up to 4 attempts total, or capped at maxAttempts).
 * Here maxRetries = 3 means initial try + up to 3 retries with delays 2s, 4s, 8s.
 */
export async function withExponentialBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    jobId?: string;
    jobType?: string;
    step: string;
    backoffScheduleMs?: number[];
  }
): Promise<T> {
  const backoffMs = options.backoffScheduleMs || [2000, 4000, 8000];
  const maxAttempts = 1 + backoffMs.length; // initial try + up to 3 retries (2s, 4s, 8s)
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();
    try {
      const result = await operation(attempt);
      logJobEvent('info', {
        jobId: options.jobId,
        jobType: options.jobType,
        step: options.step,
        attempt,
        durationMs: Date.now() - startedAt,
        status: 'ok',
      });
      return result;
    } catch (err) {
      lastError = err;
      const errType = classifyErrorType(err);
      const retryable = isRetryableAiError(err);

      logJobEvent(attempt < maxAttempts && retryable ? 'warn' : 'error', {
        jobId: options.jobId,
        jobType: options.jobType,
        step: options.step,
        attempt,
        durationMs: Date.now() - startedAt,
        status: 'failed',
        errorType: errType,
      });

      if (!retryable || attempt >= maxAttempts) {
        break;
      }

      const waitMs = backoffMs[attempt - 1] ?? 8000;
      logJobEvent('info', {
        jobId: options.jobId,
        jobType: options.jobType,
        step: `${options.step}_retry_wait`,
        attempt,
        durationMs: waitMs,
        status: 'retrying',
      });
      await sleep(waitMs);
    }
  }

  throw lastError;
}
