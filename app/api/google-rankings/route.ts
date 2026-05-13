import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { googleRankingsQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEMO_GOOGLE_KEYWORDS,
  DEMO_GOOGLE_PAGE2_KEYWORDS,
  DEMO_GOOGLE_RANK_TREND,
  DEMO_GOOGLE_SUMMARY,
} from "@/lib/demo/seed-data";

function rangeToDays(range: "7d" | "30d" | "90d"): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, googleRankingsQuerySchema, requestId);
  if (!q.success) return q.response;

  const { brandId, range } = q.data;

  if (isAuthBypassMode()) {
    return Response.json({
      source: "demo" as const,
      summary: DEMO_GOOGLE_SUMMARY,
      trend: DEMO_GOOGLE_RANK_TREND,
      topKeywords: DEMO_GOOGLE_KEYWORDS,
      page23: DEMO_GOOGLE_PAGE2_KEYWORDS,
      lastSyncedAt: null as string | null,
      requestId,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const days = rangeToDays(range);
    const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

    const { data: gsc } = await supabase
      .from("gsc_connections")
      .select("last_synced_at")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: rankRows, error } = await supabase
      .from("google_rankings")
      .select("keyword, url, position, clicks, impressions, ctr, measured_date")
      .eq("brand_id", brandId)
      .gte("measured_date", from);

    if (error) return serverErrorResponse(error.message, requestId);

    const rows = rankRows ?? [];
    if (!rows.length) {
      return Response.json({
        source: "live" as const,
        empty: true,
        summary: null,
        trend: [],
        topKeywords: [],
        page23: [],
        lastSyncedAt: gsc?.last_synced_at ?? null,
        requestId,
      });
    }

    const impressions = rows.reduce((a, r) => a + (r.impressions ?? 0), 0);
    const clicks = rows.reduce((a, r) => a + (r.clicks ?? 0), 0);
    const weightedPos = rows.reduce(
      (a, r) => a + Number(r.position ?? 0) * (r.impressions ?? 0),
      0,
    );
    const avgPosition = impressions > 0 ? weightedPos / impressions : 0;
    const ctr = impressions > 0 ? clicks / impressions : 0;

    const byKeyword = new Map<
      string,
      { keyword: string; position: number; clicks: number; impressions: number }
    >();
    for (const r of rows) {
      const k = r.keyword as string;
      const cur = byKeyword.get(k) ?? { keyword: k, position: 0, clicks: 0, impressions: 0 };
      cur.clicks += r.clicks ?? 0;
      cur.impressions += r.impressions ?? 0;
      cur.position = Math.min(cur.position || 100, Number(r.position ?? 100));
      byKeyword.set(k, cur);
    }
    const topKeywords = Array.from(byKeyword.values())
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 15);
    const page23 = Array.from(byKeyword.values()).filter((k) => k.position > 10 && k.position <= 30);

    const trendMap = new Map<string, { sum: number; w: number }>();
    for (const r of rows) {
      const d = r.measured_date as string;
      const w = r.impressions ?? 1;
      const cur = trendMap.get(d) ?? { sum: 0, w: 0 };
      cur.sum += Number(r.position ?? 0) * w;
      cur.w += w;
      trendMap.set(d, cur);
    }
    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, v]) => ({ label, position: v.w > 0 ? v.sum / v.w : 0 }));

    return Response.json({
      source: "live" as const,
      summary: {
        avgPosition: Number(avgPosition.toFixed(2)),
        clicks,
        impressions,
        ctr,
      },
      trend,
      topKeywords,
      page23,
      lastSyncedAt: gsc?.last_synced_at ?? null,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to load Google rankings", requestId);
  }
}
