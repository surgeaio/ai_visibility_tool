import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getEnv } from "@/lib/env";
import { pingRedis } from "@/lib/redis/client";

function checkEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkRedisRest(): Promise<boolean> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!restUrl || !restToken) return false;
  try {
    const redis = new Redis({ url: restUrl, token: restToken });
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function GET() {
  const env = getEnv();
  const envOk = checkEnv();
  const supabaseOk = await checkSupabase();
  const redisRestOk = await checkRedisRest();
  const redisTcpOk = await pingRedis();

  const checks = {
    env: envOk,
    supabase: supabaseOk,
    redis: redisRestOk || redisTcpOk,
  };

  const status = envOk && supabaseOk ? (checks.redis ? "ok" : "degraded") : "degraded";

  return NextResponse.json({
    status,
    checks,
    timestamp: new Date().toISOString(),
    redisConfigured: Boolean(env.REDIS_URL ?? env.UPSTASH_REDIS_URL),
    redisRestConfigured: Boolean(
      process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
    ),
  });
}
