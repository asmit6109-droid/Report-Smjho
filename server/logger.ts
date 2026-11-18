export type LogLevel = 'info' | 'warn' | 'error';

export type StructuredErrorType =
  | 'rate_limit_429'
  | 'service_unavailable_503'
  | 'timeout'
  | 'invalid_json'
  | 'auth_config'
  | 'bad_request'
  | 'network'
  | 'unknown';

export interface JobLogEvent {
  jobId?: string;
  jobType?: string;
  step: string;
  durationMs?: number;
  status?: string;
  errorType?: StructuredErrorType;
  attempt?: number;
  page?: number;
  totalPages?: number;
  queueWaiting?: number;
  queueActive?: number;
  cacheHit?: boolean;
  details?: string;
}

export function classifyErrorType(err: unknown): StructuredErrorType {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  if (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  ) {
    return 'rate_limit_429';
  }
  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('abort') ||
    msg.includes('etimedout')
  ) {
    return 'timeout';
  }
  if (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  ) {
    return 'service_unavailable_503';
  }
  if (msg.includes('json') || msg.includes('unexpected token')) {
    return 'invalid_json';
  }
  if (msg.includes('api key') || msg.includes('401') || msg.includes('403')) {
    return 'auth_config';
  }
  if (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket')
  ) {
    return 'network';
  }
  if (msg.includes('400') || msg.includes('invalid') || msg.includes('required')) {
    return 'bad_request';
  }
  return 'unknown';
}

export function logJobEvent(level: LogLevel, event: JobLogEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    ...event,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
