import IORedis, { type RedisOptions } from "ioredis";
import { getEnv } from "@/lib/env";

let redisClient: IORedis | null | undefined;

function resolveRedisUrl(): string | null {
  const env = getEnv();
  const redisUrl = env.REDIS_URL ?? env.UPSTASH_REDIS_URL;
  if (!redisUrl?.trim()) return null;

  if (redisUrl.includes("upstash.io") && env.UPSTASH_REDIS_TOKEN) {
    const url = new URL(redisUrl);
    url.username = "default";
    url.password = env.UPSTASH_REDIS_TOKEN;
    return url.toString();
  }

  return redisUrl.trim();
}

function connectionOptions(maxRetriesPerRequest: number | null): RedisOptions {
  const redisUrl = resolveRedisUrl();
  const useTls = Boolean(redisUrl?.startsWith("rediss://"));

  return {
    maxRetriesPerRequest,
    lazyConnect: true,
    enableReadyCheck: false,
    ...(useTls ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

function createClientInstance(maxRetriesPerRequest: number | null): IORedis | null {
  const redisUrl = resolveRedisUrl();
  if (!redisUrl) return null;
  return new IORedis(redisUrl, connectionOptions(maxRetriesPerRequest));
}

/** General-purpose Redis client (short-lived commands, rate limiting). */
export function getRedisClient() {
  if (redisClient === undefined) {
    redisClient = createClientInstance(2);
  }
  return redisClient ?? null;
}

/** Dedicated connection for BullMQ (requires `maxRetriesPerRequest: null`). */
export function createBullMQConnection(): IORedis | null {
  return createClientInstance(null);
}

export async function pingRedis(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/** True when a Redis TCP URL is configured (BullMQ may still fail to connect). */
export function isRedisAvailable(): boolean {
  return Boolean(resolveRedisUrl());
}
