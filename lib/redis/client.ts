import IORedis from "ioredis";
import { getEnv } from "@/lib/env";

let redisClient: IORedis | null = null;

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

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient();
  }
  return redisClient;
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
