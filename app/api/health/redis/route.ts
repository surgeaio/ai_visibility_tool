import { getRequestId } from "@/lib/api/validate";
import { pingRedis } from "@/lib/redis/client";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const ok = await pingRedis();
  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      service: "redis",
      requestId,
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
