import { SupportedLanguage } from './translations';

const SCAN_CACHE_KEY = 'reportsamjho_cache_scans_v1';
const EXPLAIN_CACHE_KEY = 'reportsamjho_cache_explanations_v1';
const TRANSLATE_CACHE_KEY = 'reportsamjho_cache_translations_v1';

const MAX_SCAN_CACHE_ITEMS = 25;
const MAX_EXPLAIN_CACHE_ITEMS = 80;
const MAX_TRANSLATE_CACHE_ITEMS = 40;

interface CacheEnvelope<T> {
  key: string;
  savedAt: number;
  value: T;
}

/**
 * Fallback deterministic non-crypto 64-bit hex digest when SubtleCrypto is unavailable
 * (e.g. non-HTTPS local preview). Combined with image lengths to prevent collisions.
 */
function fallbackDigest(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0') + `_${input.length}`;
}

export async function sha256Text(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall back below if crypto.subtle throws on non-secure origins
  }
  return fallbackDigest(input);
}

export async function computeScanImageHash(
  images: string[],
  scope: string
): Promise<string> {
  const joined = `${scope}::${images.length}::${images.join('|')}`;
  return sha256Text(joined);
}

function readEnvelopeList<T>(storageKey: string): CacheEnvelope<T>[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEnvelopeList<T>(
  storageKey: string,
  list: CacheEnvelope<T>[],
  maxItems: number
): void {
  const trimmed = list.slice(0, maxItems);
  try {
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    // Trim aggressively if quota is tight
    try {
      localStorage.setItem(storageKey, JSON.stringify(trimmed.slice(0, Math.max(3, Math.floor(maxItems / 3)))));
    } catch {
      // Ignore quota exhaustion cleanly
    }
  }
}

function getFromCache<T>(storageKey: string, key: string): T | null {
  const list = readEnvelopeList<T>(storageKey);
  const found = list.find((item) => item.key === key);
  return found ? found.value : null;
}

function putInCache<T>(
  storageKey: string,
  key: string,
  value: T,
  maxItems: number
): void {
  const existing = readEnvelopeList<T>(storageKey).filter((item) => item.key !== key);
  const next: CacheEnvelope<T>[] = [{ key, savedAt: Date.now(), value }, ...existing];
  writeEnvelopeList(storageKey, next, maxItems);
}

// 1. Scan Result Cache (by image SHA-256 hash + scan scope)
export function getCachedScanResult<T>(imageHash: string): T | null {
  return getFromCache<T>(SCAN_CACHE_KEY, imageHash);
}

export function setCachedScanResult<T>(imageHash: string, value: T): void {
  putInCache(SCAN_CACHE_KEY, imageHash, value, MAX_SCAN_CACHE_ITEMS);
}

// 2. Topic Explanation Cache (keyed by topic + language + optional value)
export interface CachedTopicExplanation {
  title: string;
  analogy: string;
  whatItMeasures: string;
  yourResultMeans: string;
  feelings: string[];
  doctorQuestion: string;
  flowSteps?: Array<{ icon: string; label: string }>;
  flowHighlightIndex?: number;
  flowCaption?: string;
  isUncertain?: boolean;
}

export function buildExplanationCacheKey(
  topicId: string,
  language: SupportedLanguage,
  valueKey?: string
): string {
  const cleanTopic = topicId.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 64);
  const cleanVal = (valueKey || '').trim().toLowerCase().slice(0, 32);
  return cleanVal ? `${cleanTopic}::${language}::${cleanVal}` : `${cleanTopic}::${language}`;
}

export function getCachedTopicExplanation(key: string): CachedTopicExplanation | null {
  return getFromCache<CachedTopicExplanation>(EXPLAIN_CACHE_KEY, key);
}

export function setCachedTopicExplanation(key: string, value: CachedTopicExplanation): void {
  putInCache(EXPLAIN_CACHE_KEY, key, value, MAX_EXPLAIN_CACHE_ITEMS);
}

export function getCachedPersonalLine(
  topicId: string,
  language: SupportedLanguage,
  valueKey: string
): string | null {
  return getFromCache<string>(
    EXPLAIN_CACHE_KEY,
    `line::${buildExplanationCacheKey(topicId, language, valueKey)}`
  );
}

export function setCachedPersonalLine(
  topicId: string,
  language: SupportedLanguage,
  valueKey: string,
  line: string
): void {
  putInCache(
    EXPLAIN_CACHE_KEY,
    `line::${buildExplanationCacheKey(topicId, language, valueKey)}`,
    line,
    MAX_EXPLAIN_CACHE_ITEMS
  );
}

// 3. Translation Cache (keyed by payload hash + targetLanguage)
export async function computeTranslationCacheKey(
  kind: 'report' | 'medicine',
  payload: unknown,
  targetLanguage: SupportedLanguage
): Promise<string> {
  const digest = await sha256Text(`${kind}:${targetLanguage}:${JSON.stringify(payload)}`);
  return `${kind}:${targetLanguage}:${digest.slice(0, 24)}`;
}

export function getCachedTranslation<T>(cacheKey: string): T | null {
  return getFromCache<T>(TRANSLATE_CACHE_KEY, cacheKey);
}

export function setCachedTranslation<T>(cacheKey: string, value: T): void {
  putInCache(TRANSLATE_CACHE_KEY, cacheKey, value, MAX_TRANSLATE_CACHE_ITEMS);
}

// 4. Settings inspection & cache clearing (never touches saved reports or medicines)
export function getCacheStats(): {
  scansCount: number;
  explanationsCount: number;
  translationsCount: number;
  totalCount: number;
} {
  const scansCount = readEnvelopeList(SCAN_CACHE_KEY).length;
  const explanationsCount = readEnvelopeList(EXPLAIN_CACHE_KEY).length;
  const translationsCount = readEnvelopeList(TRANSLATE_CACHE_KEY).length;
  return {
    scansCount,
    explanationsCount,
    translationsCount,
    totalCount: scansCount + explanationsCount + translationsCount,
  };
}

export function clearAllCaches(): void {
  try {
    localStorage.removeItem(SCAN_CACHE_KEY);
    localStorage.removeItem(EXPLAIN_CACHE_KEY);
    localStorage.removeItem(TRANSLATE_CACHE_KEY);
  } catch (err) {
    console.error('Failed to clear caches', err);
  }
}
