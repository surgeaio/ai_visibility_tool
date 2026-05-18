import { getRequestId } from "@/lib/api/validate";
import { syncGscData } from "@/lib/services/gsc/sync";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

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

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    return Response.json({ error: "Database not configured", requestId }, { status: 503 });
  }

  const { data: connections } = await admin.from("gsc_connections").select("id").eq("is_active", true);

  const results: Array<{ id: string; status: string; error?: string }> = [];
  for (const conn of connections ?? []) {
    try {
      await syncGscData({ connectionId: conn.id, daysBack: 3 });
      results.push({ id: conn.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "failed";
      results.push({ id: conn.id, status: "failed", error: message });
    }
  }

  return Response.json({ synced: results.length, results, requestId });
}
