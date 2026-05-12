import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { pingRedis } from "@/lib/redis/client";

export async function GET() {
  const redisOk = await pingRedis();
  const env = getEnv();
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    redisConfigured: Boolean(env.REDIS_URL ?? env.UPSTASH_REDIS_URL),
    redis: redisOk ? "up" : "skipped_or_down",
  });
}
