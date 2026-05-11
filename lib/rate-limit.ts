const bucket = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX = 10;

export function rateLimit(key: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const prev = bucket.get(key) ?? [];
  const fresh = prev.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX) {
    const oldest = Math.min(...fresh);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  fresh.push(now);
  bucket.set(key, fresh);
  return { ok: true };
}
