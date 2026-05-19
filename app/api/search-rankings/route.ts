export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

type RankingRow = {
  query: string;
  page_url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  positionChange?: number | null;
};

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const brandId = new URL(req.url).searchParams.get("brandId");
  if (!brandId) {
    return Response.json({ error: "brandId required", requestId }, { status: 400 });
  }

  const admin = tryCreateAdminSupabaseClient();
  const supabase = admin ?? (await createServerSupabaseClient());

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!brand) {
    return Response.json({ error: "Brand not found", requestId }, { status: 403 });
  }

  const { data: connection } = await supabase
    .from("gsc_connections")
    .select("id, site_url, last_synced_at")
    .eq("brand_id", brandId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection) {
    return Response.json({ connected: false, rankings: [], suggestions: [], requestId });
  }

  const startDate = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const prevStart = new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10);
  const prevEnd = new Date(Date.now() - 31 * 86400_000).toISOString().slice(0, 10);

  const { data: rawRankings } = await supabase
    .from("gsc_query_rankings")
    .select("query, page_url, clicks, impressions, ctr, position, metric_date")
    .eq("brand_id", brandId)
    .gte("metric_date", startDate)
    .order("impressions", { ascending: false })
    .limit(2000);

  const { data: prevRankings } = await supabase
    .from("gsc_query_rankings")
    .select("query, page_url, position")
    .eq("brand_id", brandId)
    .gte("metric_date", prevStart)
    .lte("metric_date", prevEnd);

  const prevMap = new Map<string, number>();
  for (const r of prevRankings ?? []) {
    const key = `${r.query}||${r.page_url}`;
    const pos = Number(r.position ?? 0);
    const existing = prevMap.get(key);
    if (existing === undefined || pos < existing) prevMap.set(key, pos);
  }

  const map = new Map<string, RankingRow>();
  for (const r of rawRankings ?? []) {
    const key = `${r.query}||${r.page_url}`;
    const existing = map.get(key);
    if (existing) {
      existing.clicks += r.clicks ?? 0;
      existing.impressions += r.impressions ?? 0;
      const totalWeight = existing.impressions + (r.impressions ?? 0);
      existing.position =
        totalWeight > 0
          ? (existing.position * existing.impressions + Number(r.position ?? 0) * (r.impressions ?? 0)) /
            totalWeight
          : existing.position;
    } else {
      map.set(key, {
        query: r.query as string,
        page_url: r.page_url as string,
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: Number(r.ctr ?? 0),
        position: Number(r.position ?? 0),
      });
    }
  }

  const rankings = Array.from(map.values())
    .map((r) => {
      const key = `${r.query}||${r.page_url}`;
      const prevPos = prevMap.get(key);
      const positionChange =
        prevPos !== undefined ? Number((prevPos - r.position).toFixed(2)) : null;
      return {
        ...r,
        ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
        positionChange,
      };
    })
    .sort((a, b) => b.impressions - a.impressions);

  const { data: suggestions } = await supabase
    .from("gsc_improvement_suggestions")
    .select("*")
    .eq("brand_id", brandId)
    .eq("status", "open")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  return Response.json({
    connected: true,
    property: connection.site_url,
    lastSyncedAt: connection.last_synced_at,
    rankings,
    suggestions: (suggestions ?? []).map((s) => ({
      ...s,
      action_items: Array.isArray(s.action_items) ? s.action_items : [],
    })),
    requestId,
  });
}
