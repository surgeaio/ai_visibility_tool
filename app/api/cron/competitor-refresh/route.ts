import { getRequestId } from "@/lib/api/validate";
import { syncCompetitorRankings } from "@/lib/services/competitors/sync-rankings";
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

  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) {
    return Response.json({ error: "Database not configured", requestId }, { status: 503 });
  }

  const { data: brands } = await supabase.from("brand_competitors").select("brand_id").eq("is_active", true);

  const uniqueBrandIds = Array.from(new Set((brands ?? []).map((b) => b.brand_id)));

  const results: Array<{ brandId: string; ranked?: number; error?: string }> = [];
  for (const brandId of uniqueBrandIds) {
    try {
      const result = await syncCompetitorRankings(brandId);
      results.push({ brandId, ...result });
    } catch (err: unknown) {
      results.push({
        brandId,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }

  return Response.json({ synced: results.length, results, requestId });
}
