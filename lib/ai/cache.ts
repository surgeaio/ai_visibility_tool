import { createHash } from "crypto";
import { getRedisClient } from "@/lib/redis/client";

const memory = new Map<string, { expiresAt: number; value: string }>();

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function redisCacheKey(hashed: string) {
  return `ai:response:${hashed}`;
}

export function makeAICacheKey(input: {
  provider: string;
  model: string;
  prompt: string;
  temperature?: number;
}) {
  return `${input.provider}:${input.model}:${input.temperature ?? 0.2}:${input.prompt}`;
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const hashed = hashKey(key);
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const remote = await redis.get(redisCacheKey(hashed));
      if (remote) return remote;
    } catch {
      /* fall back to memory */
    }
  }
  const entry = memory.get(hashed);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(hashed);
    return null;
  }
  return entry.value;
}

export async function setCachedResponse(key: string, value: string, ttlMs = 24 * 60 * 60 * 1000) {
  const hashed = hashKey(key);
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.set(redisCacheKey(hashed), value, "PX", ttlMs);
      return;
    } catch {
      /* fall back to memory */
    }
  }
  memory.set(hashed, { value, expiresAt: Date.now() + ttlMs });
}
