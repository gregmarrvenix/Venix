const store = new Map<string, { data: unknown; timestamp: number }>();
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function isStale(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return true;
  return Date.now() - entry.timestamp > STALE_MS;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}
