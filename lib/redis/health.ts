import { pingRedis } from "@/lib/redis/client";

export type RedisHealthResult =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs?: undefined; reason: "not_configured" | "ping_failed" };

export async function getRedisHealth(): Promise<RedisHealthResult> {
  const started = Date.now();
  const ok = await pingRedis();
  if (!ok) {
    const clientMissing = !(process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim());
    return { ok: false, reason: clientMissing ? "not_configured" : "ping_failed" };
  }
  return { ok: true, latencyMs: Date.now() - started };
}
