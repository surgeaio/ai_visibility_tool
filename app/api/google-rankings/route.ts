import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import {
  DEMO_GOOGLE_KEYWORDS,
  DEMO_GOOGLE_PAGE2_KEYWORDS,
  DEMO_GOOGLE_RANK_TREND,
  DEMO_GOOGLE_SUMMARY,
} from "@/lib/demo/seed-data";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { googleRankingsQuerySchema } from "@/lib/validators";

function rangeToDays(range: "7d" | "30d" | "90d"): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, googleRankingsQuerySchema, requestId);
  if (!q.success) return q.response;

  const { brandId, range } = q.data;
  const days = rangeToDays(range);
  const startDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

  if (isAuthBypassMode()) {
    return Response.json({
      connected: true,
      source: "demo" as const,
      summary: { ...DEMO_GOOGLE_SUMMARY, indexedPages: 42, notIndexedPages: 3 },
      trend: DEMO_GOOGLE_RANK_TREND,
      topKeywords: DEMO_GOOGLE_KEYWORDS,
      topPages: DEMO_GOOGLE_KEYWORDS.map((k) => ({
        url: `https://example.com/${k.keyword.replace(/\s+/g, "-")}`,
        clicks: k.clicks,
        impressions: k.impressions,
      })),
      page23: DEMO_GOOGLE_PAGE2_KEYWORDS,
      lastSyncedAt: null as string | null,
      property: "sc-domain:demo.example",
      googleEmail: "demo@example.com",
      requestId,
    });
  }

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const admin = tryCreateAdminSupabaseClient();
    const supabase = admin ?? (await createServerSupabaseClient());

    const { data: connection } = await supabase
      .from("gsc_connections")
      .select("id, site_url, last_synced_at, google_email")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!connection) {
      return Response.json({
        connected: false,
        source: "live" as const,
        empty: true,
        summary: null,
        trend: [],
        topKeywords: [],
        topPages: [],
        page23: [],
        lastSyncedAt: null,
        requestId,
      });
    }

    const { data: daily, error: dailyErr } = await supabase
      .from("gsc_daily_metrics")
      .select("*")
      .eq("brand_id", brandId)
      .gte("metric_date", startDate)
      .order("metric_date", { ascending: true });

    if (dailyErr) return serverErrorResponse(dailyErr.message, requestId);

    const dailyRows = daily ?? [];

    if (!dailyRows.length) {
      return Response.json({
        connected: true,
        source: "live" as const,
        empty: true,
        property: connection.site_url,
        googleEmail: connection.google_email,
        summary: null,
        trend: [],
        topKeywords: [],
        topPages: [],
        page23: [],
        lastSyncedAt: connection.last_synced_at,
        requestId,
      });
    }

    const totalClicks = dailyRows.reduce((s, d) => s + (d.clicks ?? 0), 0);
    const totalImpressions = dailyRows.reduce((s, d) => s + (d.impressions ?? 0), 0);
    const avgPosition =
      dailyRows.length > 0
        ? dailyRows.reduce((s, d) => s + Number(d.avg_position ?? 0), 0) / dailyRows.length
        : 0;
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const latestDay = dailyRows[dailyRows.length - 1];

    const trend = dailyRows.map((d) => ({
      label: d.metric_date as string,
      position: Number(d.avg_position ?? 0),
      clicks: d.clicks ?? 0,
      impressions: d.impressions ?? 0,
      ctr: Number(d.ctr ?? 0),
    }));

    const { data: queryRows } = await supabase
      .from("gsc_query_rankings")
      .select("query, page_url, clicks, impressions, ctr, position")
      .eq("brand_id", brandId)
      .gte("metric_date", startDate);

    const byKeyword = new Map<
      string,
      { keyword: string; position: number; clicks: number; impressions: number }
    >();
    const pageMap = new Map<string, { clicks: number; impressions: number }>();

    for (const r of queryRows ?? []) {
      const k = r.query as string;
      const cur = byKeyword.get(k) ?? { keyword: k, position: 100, clicks: 0, impressions: 0 };
      cur.clicks += r.clicks ?? 0;
      cur.impressions += r.impressions ?? 0;
      cur.position = Math.min(cur.position, Number(r.position ?? 100));
      byKeyword.set(k, cur);

      const page = r.page_url as string;
      const p = pageMap.get(page) ?? { clicks: 0, impressions: 0 };
      p.clicks += r.clicks ?? 0;
      p.impressions += r.impressions ?? 0;
      pageMap.set(page, p);
    }

    const topKeywords = Array.from(byKeyword.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 15);
    const page23 = Array.from(byKeyword.values()).filter((k) => k.position > 10 && k.position <= 30);
    const topPages = Array.from(pageMap.entries())
      .map(([url, m]) => ({ url, clicks: m.clicks, impressions: m.impressions }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    return Response.json({
      connected: true,
      source: "live" as const,
      property: connection.site_url,
      googleEmail: connection.google_email,
      lastSyncedAt: connection.last_synced_at,
      summary: {
        avgPosition: Number(avgPosition.toFixed(2)),
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr,
        indexedPages: latestDay?.indexed_pages ?? 0,
        notIndexedPages: latestDay?.not_indexed_pages ?? 0,
      },
      trend,
      topKeywords,
      topPages,
      page23,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to load Google rankings", requestId);
  }
}
