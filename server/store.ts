import { logJobEvent } from './logger.js';

export type StoreMode = 'upstash_redis' | 'replit_db' | 'memory';

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const MAX_MEMORY_ENTRIES = 1000;
const memoryStore = new Map<string, MemoryEntry>();

function pruneMemoryStore() {
  const now = Date.now();
  for (const [k, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(k);
    }
  }
  if (memoryStore.size > MAX_MEMORY_ENTRIES) {
    const excess = memoryStore.size - MAX_MEMORY_ENTRIES;
    let removed = 0;
    for (const k of memoryStore.keys()) {
      memoryStore.delete(k);
      removed++;
      if (removed >= excess) break;
    }
  }
}

export function getStoreMode(): StoreMode {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'upstash_redis';
  }
  if (process.env.REPLIT_DB_URL) {
    return 'replit_db';
  }
  return 'memory';
}

async function upstashCommand<T = unknown>(args: (string | number)[]): Promise<T | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) return null;

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`Upstash Redis HTTP ${res.status}`);
  }
  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) {
    throw new Error(`Upstash Redis error: ${data.error}`);
  }
  return data.result ?? null;
}

async function replitDbGet(key: string): Promise<string | null> {
  const dbUrl = process.env.REPLIT_DB_URL;
  if (!dbUrl) return null;
  const res = await fetch(`${dbUrl}/${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Replit DB GET HTTP ${res.status}`);
  return await res.text();
}

async function replitDbSet(key: string, value: string): Promise<void> {
  const dbUrl = process.env.REPLIT_DB_URL;
  if (!dbUrl) return;
  const body = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  const res = await fetch(dbUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Replit DB SET HTTP ${res.status}`);
}

async function replitDbDelete(key: string): Promise<void> {
  const dbUrl = process.env.REPLIT_DB_URL;
  if (!dbUrl) return;
  await fetch(`${dbUrl}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(3000),
  });
}

export async function storeGetJson<T>(key: string): Promise<T | null> {
  const mode = getStoreMode();
  try {
    if (mode === 'upstash_redis') {
      const raw = await upstashCommand<string>(['GET', key]);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    }

    if (mode === 'replit_db') {
      const raw = await replitDbGet(key);
      if (!raw) return null;
      const wrapped = JSON.parse(raw) as { expiresAt?: number; data: T };
      if (wrapped.expiresAt && wrapped.expiresAt <= Date.now()) {
        replitDbDelete(key).catch(() => {});
        return null;
      }
      return wrapped.data;
    }
  } catch (err) {
    logJobEvent('warn', {
      step: 'store_get_fallback',
      details: err instanceof Error ? err.message : 'external store unavailable',
    });
  }

  const mem = memoryStore.get(key);
  if (!mem) return null;
  if (mem.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(mem.value) as T;
  } catch {
    return null;
  }
}

export async function storeSetJson<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  const mode = getStoreMode();
  const expiresAt = Date.now() + ttlSeconds * 1000;

  // Always write fast L1 memory copy as well (bounded) for instant same-instance reads
  pruneMemoryStore();
  memoryStore.set(key, { value: JSON.stringify(data), expiresAt });

  try {
    if (mode === 'upstash_redis') {
      await upstashCommand(['SET', key, JSON.stringify(data), 'EX', ttlSeconds]);
      return;
    }

    if (mode === 'replit_db') {
      await replitDbSet(key, JSON.stringify({ expiresAt, data }));
      return;
    }
  } catch (err) {
    logJobEvent('warn', {
      step: 'store_set_fallback',
      details: err instanceof Error ? err.message : 'external store unavailable',
    });
  }
}

export async function storeDelete(key: string): Promise<void> {
  memoryStore.delete(key);
  const mode = getStoreMode();
  try {
    if (mode === 'upstash_redis') {
      await upstashCommand(['DEL', key]);
    } else if (mode === 'replit_db') {
      await replitDbDelete(key);
    }
  } catch {
    // ignore cleanup error
  }
}

/**
 * Distributed-friendly window counter for rate limiting.
 * Uses Redis INCR/EXPIRE when Upstash is configured, otherwise in-memory sliding timestamps.
 */
const slidingRateMap = new Map<string, number[]>();

export async function checkAndIncrementRateLimit(
  bucketKey: string,
  windowSeconds: number,
  maxAllowed: number
): Promise<{ allowed: boolean; count: number }> {
  const mode = getStoreMode();

  if (mode === 'upstash_redis') {
    try {
      const windowBucket = Math.floor(Date.now() / (windowSeconds * 1000));
      const fullKey = `${bucketKey}:${windowBucket}`;
      const count = await upstashCommand<number>(['INCR', fullKey]);
      if (count === 1) {
        await upstashCommand(['EXPIRE', fullKey, windowSeconds + 5]);
      }
      if (typeof count === 'number') {
        return { allowed: count <= maxAllowed, count };
      }
    } catch {
      // Fallback safely to in-memory limiter if external Redis blips
    }
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const active = (slidingRateMap.get(bucketKey) || []).filter((ts) => now - ts < windowMs);

  if (active.length >= maxAllowed) {
    slidingRateMap.set(bucketKey, active);
    return { allowed: false, count: active.length };
  }

  active.push(now);
  slidingRateMap.set(bucketKey, active);

  // Periodically prune stale buckets to prevent unbounded growth
  if (slidingRateMap.size > 2000) {
    for (const [k, list] of slidingRateMap.entries()) {
      if (list.every((ts) => now - ts >= windowMs)) {
        slidingRateMap.delete(k);
      }
    }
  }

  return { allowed: true, count: active.length };
}
