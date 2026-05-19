export const dynamic = "force-dynamic";

import { getRequestId } from "@/lib/api/validate";
import { getRedisHealth } from "@/lib/redis/health";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const health = await getRedisHealth();
  if (!health.ok) {
    return Response.json(
      {
        status: "degraded",
        service: "redis",
        requestId,
        checkedAt: new Date().toISOString(),
        reason: health.reason,
      },
      { status: 503 },
    );
  }
  return Response.json({
    status: "ok",
    service: "redis",
    requestId,
    checkedAt: new Date().toISOString(),
    latencyMs: health.latencyMs,
  });
}
