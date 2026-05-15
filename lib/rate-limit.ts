import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX = 10;

const memory = new Map<string, number[]>();
let warnedMemory = false;
let ratelimit: Ratelimit | null | undefined;

function getUpstashRatelimit(): Ratelimit | null {
  if (ratelimit !== undefined) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    ratelimit = null;
    return null;
  }
  const redis = new Redis({ url, token });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX, "60 s"),
    prefix: "ai-visibility",
  });
  return ratelimit;
}

function memoryRateLimit(key: string): { ok: boolean; retryAfter?: number } {
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

/**
 * Distributed rate limit when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set (Upstash REST API).
 * Falls back to in-memory sliding window (not safe across serverless instances).
 */
export async function rateLimit(key: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const rl = getUpstashRatelimit();
  if (rl) {
    const result = await rl.limit(key);
    if (!result.success) {
      const resetMs = result.reset - Date.now();
      return { ok: false, retryAfter: Math.max(1, Math.ceil(resetMs / 1000)) };
    }
    return { ok: true };
  }
  if (process.env.NODE_ENV === "production" && !warnedMemory) {
    console.warn(
      "[rate-limit] Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (Upstash REST) for distributed limits.",
    );
    warnedMemory = true;
  }
  return memoryRateLimit(key);
}
