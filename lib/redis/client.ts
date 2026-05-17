import IORedis from "ioredis";
import { getEnv } from "@/lib/env";

let redisClient: IORedis | null | undefined;

function createClient() {
  const env = getEnv();
  const redisUrl = env.REDIS_URL ?? env.UPSTASH_REDIS_URL;
  if (!redisUrl) return null;

  if (redisUrl.includes("upstash.io") && env.UPSTASH_REDIS_TOKEN) {
    const url = new URL(redisUrl);
    url.username = "default";
    url.password = env.UPSTASH_REDIS_TOKEN;
    return new IORedis(url.toString(), {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableReadyCheck: false,
    });
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableReadyCheck: false,
  });
}

/** Dedicated connection for BullMQ (requires `maxRetriesPerRequest: null`). */
export function createBullMQConnection(): IORedis | null {
  const env = getEnv();
  const redisUrl = env.REDIS_URL ?? env.UPSTASH_REDIS_URL;
  if (!redisUrl) return null;

  if (redisUrl.includes("upstash.io") && env.UPSTASH_REDIS_TOKEN) {
    const url = new URL(redisUrl);
    url.username = "default";
    url.password = env.UPSTASH_REDIS_TOKEN;
    return new IORedis(url.toString(), {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableReadyCheck: false,
    });
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableReadyCheck: false,
  });
}

export function getRedisClient() {
  if (redisClient === undefined) {
    redisClient = createClient();
  }
  return redisClient ?? null;
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
  const url = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
  return Boolean(url?.trim());
}
