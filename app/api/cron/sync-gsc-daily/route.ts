export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { getRequestId } from "@/lib/api/validate";
import { syncAllActiveGscConnections } from "@/lib/services/gsc-sync";

export const maxDuration = 300;

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  if (!authorizeCron(req)) {
    console.error("[cron/sync-gsc-daily] Unauthorized");
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const result = await syncAllActiveGscConnections();
    console.log("[cron/sync-gsc-daily] done", result);
    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      connections: result.connections,
      rows: result.rows,
      requestId,
    });
  } catch (err) {
    console.error("[cron/sync-gsc-daily] fatal", err);
    return NextResponse.json(
      {
        error: "GSC sync cron failed",
        message: err instanceof Error ? err.message : "Unknown",
        requestId,
      },
      { status: 500 },
    );
  }
}
