export const dynamic = "force-dynamic";

import { getRequestId } from "@/lib/api/validate";
import { syncAllActiveGscConnections } from "@/lib/services/gsc-sync";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  if (!authorizeCron(req)) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }
  try {
    const result = await syncAllActiveGscConnections();
    return Response.json({ ok: true as const, ...result, requestId });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "sync_failed", requestId }, { status: 500 });
  }
}
