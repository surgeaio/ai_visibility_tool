const WINDOW_MS = 60_000;
const MAX = 10;

const memory = new Map<string, number[]>();

/**
 * In-memory sliding-window rate limit (per serverless instance).
 */
export async function rateLimit(key: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const now = Date.now();
  const prev = memory.get(key) ?? [];
  const fresh = prev.filter((t) => now - t < WINDOW_MS);
  if (fresh.length >= MAX) {
    const oldest = Math.min(...fresh);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  fresh.push(now);
  memory.set(key, fresh);
  return { ok: true };
}
