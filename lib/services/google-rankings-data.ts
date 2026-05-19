import {
  aggregateCountries,
  aggregateDevices,
  aggregateKeywords,
  aggregatePages,
  filterPage23Keywords,
  paginate,
  percentChange,
  type QueryRow,
} from "@/lib/google-rankings/aggregate";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type GoogleRankingsRange = "7d" | "30d" | "90d";

function rangeToDays(range: GoogleRankingsRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date(Date.now() - days * 86400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    prevStartDate: new Date(Date.now() - days * 2 * 86400_000).toISOString().slice(0, 10),
    prevEndDate: new Date(Date.now() - days * 86400_000 - 86400_000).toISOString().slice(0, 10),
  };
}

export async function loadGoogleRankingsForBrand(params: {
  userId: string;
  brandId: string;
  range: GoogleRankingsRange;
  queriesPage: number;
  pagesPage: number;
  page23Page: number;
  pageSize: number;
}) {
  const { userId, brandId, range, queriesPage, pagesPage, page23Page, pageSize } = params;
  const days = rangeToDays(range);
  const { startDate, prevStartDate } = dateRange(days);

  const admin = tryCreateAdminSupabaseClient();
  const supabase = admin ?? (await createServerSupabaseClient());

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!brand) {
    return { error: "FORBIDDEN" as const };
  }

  const { data: connection } = await supabase
    .from("gsc_connections")
    .select("id, site_url, last_synced_at, google_email")
    .eq("brand_id", brandId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection) {
    return {
      connected: false,
      empty: true,
      brandName: brand.name,
    };
  }

  const { data: daily, error: dailyErr } = await supabase
    .from("gsc_daily_metrics")
    .select("*")
    .eq("brand_id", brandId)
    .eq("site_url", connection.site_url)
    .gte("metric_date", startDate)
    .order("metric_date", { ascending: true });

  if (dailyErr) throw new Error(dailyErr.message);

  const dailyRows = daily ?? [];

  const { data: prevDaily } = await supabase
    .from("gsc_daily_metrics")
    .select("clicks, impressions, ctr, avg_position")
    .eq("brand_id", brandId)
    .eq("site_url", connection.site_url)
    .gte("metric_date", prevStartDate)
    .lt("metric_date", startDate);

  if (!dailyRows.length) {
    return {
      connected: true,
      empty: true,
      property: connection.site_url,
      googleEmail: connection.google_email,
      lastSyncedAt: connection.last_synced_at,
      brandName: brand.name,
    };
  }

  const totalClicks = dailyRows.reduce((s, d) => s + (d.clicks ?? 0), 0);
  const totalImpressions = dailyRows.reduce((s, d) => s + (d.impressions ?? 0), 0);
  const avgPosition =
    dailyRows.reduce((s, d) => s + Number(d.avg_position ?? 0), 0) / dailyRows.length;
  const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  const prevRows = prevDaily ?? [];
  const prevClicks = prevRows.reduce((s, d) => s + (d.clicks ?? 0), 0);
  const prevImpressions = prevRows.reduce((s, d) => s + (d.impressions ?? 0), 0);
  const prevAvgPosition =
    prevRows.length > 0
      ? prevRows.reduce((s, d) => s + Number(d.avg_position ?? 0), 0) / prevRows.length
      : 0;
  const prevCtr = prevImpressions > 0 ? prevClicks / prevImpressions : 0;

  const latestDay = dailyRows[dailyRows.length - 1];

  const trend = dailyRows.map((d) => ({
    date: d.metric_date as string,
    clicks: d.clicks ?? 0,
    impressions: d.impressions ?? 0,
    ctr: Number(d.ctr ?? 0),
    position: Number(d.avg_position ?? 0),
  }));

  const { data: rawQuery } = await supabase
    .from("gsc_query_rankings")
    .select("query, page_url, clicks, impressions, ctr, position, country, device")
    .eq("brand_id", brandId)
    .eq("site_url", connection.site_url)
    .gte("metric_date", startDate);

  const queryRows: QueryRow[] = (rawQuery ?? []).map((r) => ({
    query: r.query as string,
    page_url: r.page_url as string,
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0),
    country: r.country as string | null,
    device: r.device as string | null,
  }));

  const allKeywords = aggregateKeywords(queryRows);
  const allPages = aggregatePages(queryRows);
  const page23All = filterPage23Keywords(allKeywords);

  return {
    connected: true,
    empty: false,
    property: connection.site_url,
    googleEmail: connection.google_email,
    lastSyncedAt: connection.last_synced_at,
    brandName: brand.name,
    range,
    summary: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr,
      avgPosition: Number(avgPosition.toFixed(2)),
      indexedPages: latestDay?.indexed_pages ?? 0,
      notIndexedPages: latestDay?.not_indexed_pages ?? 0,
    },
    comparison: {
      clicks: percentChange(totalClicks, prevClicks),
      impressions: percentChange(totalImpressions, prevImpressions),
      ctr: percentChange(ctr * 100, prevCtr * 100),
      position: percentChange(prevAvgPosition, avgPosition),
    },
    trend,
    tables: {
      queries: paginate(allKeywords, queriesPage, pageSize),
      pages: paginate(allPages, pagesPage, pageSize),
      page23: paginate(page23All, page23Page, pageSize),
    },
    countries: aggregateCountries(queryRows),
    devices: aggregateDevices(queryRows),
    searchAppearance: [] as { type: string; clicks: number; impressions: number }[],
  };
}
