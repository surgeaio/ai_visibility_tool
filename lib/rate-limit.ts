import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getRedisClient, isRedisAvailable } from "@/lib/redis/client";

const WINDOW_MS = 60_000;
const MAX = 10;

const memory = new Map<string, number[]>();
let warnedMemory = false;
let upstashRatelimit: Ratelimit | null | undefined;

function getUpstashRatelimit(): Ratelimit | null {
  if (upstashRatelimit !== undefined) return upstashRatelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    upstashRatelimit = null;
    return null;
  }
  const redis = new Redis({ url, token });
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX, "60 s"),
    prefix: "ai-visibility",
  });
  return upstashRatelimit;
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

async function ioredisRateLimit(key: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const client = getRedisClient();
  if (!client) return memoryRateLimit(key);

  const redisKey = `ai-visibility:rl:${key}`;
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pexpire(redisKey, WINDOW_MS);
    }
    if (count > MAX) {
      const ttl = await client.pttl(redisKey);
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((ttl > 0 ? ttl : WINDOW_MS) / 1000)),
      };
    }
    return { ok: true };
  } catch {
    return memoryRateLimit(key);
  }
}

/**
 * Distributed rate limit via Railway/Redis TCP (`REDIS_URL`), legacy Upstash REST, or in-memory fallback.
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

  if (isRedisAvailable()) {
    return ioredisRateLimit(key);
  }

  if (process.env.NODE_ENV === "production" && !warnedMemory) {
    console.warn("[rate-limit] Set REDIS_URL for distributed limits across serverless instances.");
    warnedMemory = true;
  }
  return memoryRateLimit(key);
}
