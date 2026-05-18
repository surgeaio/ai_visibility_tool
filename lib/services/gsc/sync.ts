import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { GoogleSearchConsoleService } from "@/lib/services/google-search-console";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getValidAccessToken } from "./token";

type GscRow = Database["public"]["Tables"]["gsc_connections"]["Row"];

export interface SyncGscOptions {
  connectionId: string;
  daysBack?: number;
}

export async function syncGscData({
  connectionId,
  daysBack = 30,
}: SyncGscOptions): Promise<{ dailyRows: number; queryRows: number }> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) throw new Error("Admin Supabase client not configured");

  const { data: conn, error } = await admin
    .from("gsc_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !conn) throw new Error("Connection not found");
  if (!conn.is_active) throw new Error("Connection inactive");

  const accessToken = await getValidAccessToken(connectionId);
  if (!accessToken) throw new Error("Could not obtain valid access token");

  const oauth = new GoogleOAuthService();
  const gsc = new GoogleSearchConsoleService(oauth.getAuthenticatedClient(accessToken));
  const siteUrl = conn.site_url;
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - daysBack * 86400_000).toISOString().slice(0, 10);

  console.log(`[gsc-sync] ${siteUrl} ${startDate} → ${endDate}`);

  const dailyAnalytics = await gsc.getSearchAnalytics(siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 1000,
  });

  const dailyRows = dailyAnalytics.map((r) => ({
    brand_id: conn.brand_id,
    site_url: siteUrl,
    metric_date: r.keys[0] ?? endDate,
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    avg_position: r.position,
    indexed_pages: 0,
    not_indexed_pages: 0,
  }));

  if (dailyRows.length > 0) {
    const { error: dailyErr } = await admin
      .from("gsc_daily_metrics")
      .upsert(dailyRows, { onConflict: "brand_id,site_url,metric_date" });
    if (dailyErr) console.error("[gsc-sync] daily upsert:", dailyErr.message);
    else console.log(`[gsc-sync] daily rows: ${dailyRows.length}`);
  }

  const queryAnalytics = await gsc.getSearchAnalytics(siteUrl, {
    startDate,
    endDate,
    dimensions: ["query", "page"],
    rowLimit: 5000,
  });

  const queryRows = queryAnalytics
    .filter((r) => r.keys[0] && r.keys[1])
    .map((r) => ({
      brand_id: conn.brand_id,
      site_url: siteUrl,
      metric_date: endDate,
      query: r.keys[0]!,
      page_url: r.keys[1]!,
      country: null as string | null,
      device: null as string | null,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));

  if (queryRows.length > 0) {
    const { error: qErr } = await admin.from("gsc_query_rankings").upsert(queryRows, {
      onConflict: "brand_id,site_url,metric_date,query,page_url",
    });
    if (qErr) {
      console.error("[gsc-sync] query upsert:", qErr.message);
    } else {
      console.log(`[gsc-sync] query rows: ${queryRows.length}`);
    }

    await syncLegacyGoogleRankings(admin, conn, queryRows, endDate);
  }

  const distinctPages = new Set(queryRows.map((r) => r.page_url)).size;
  if (distinctPages > 0) {
    await admin
      .from("gsc_daily_metrics")
      .update({ indexed_pages: distinctPages })
      .eq("brand_id", conn.brand_id)
      .eq("site_url", siteUrl)
      .eq("metric_date", endDate);
  }

  await admin
    .from("gsc_connections")
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  console.log("[gsc-sync] done");
  return { dailyRows: dailyRows.length, queryRows: queryRows.length };
}

/** Keeps legacy google_rankings table populated for older code paths. */
async function syncLegacyGoogleRankings(
  admin: NonNullable<ReturnType<typeof tryCreateAdminSupabaseClient>>,
  conn: GscRow,
  queryRows: Array<{
    query: string;
    page_url: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>,
  measuredDate: string,
) {
  for (const r of queryRows) {
    await admin.from("google_rankings").upsert(
      {
        brand_id: conn.brand_id,
        keyword: r.query,
        url: r.page_url,
        position: r.position,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        click_through_rate: r.ctr,
        measured_date: measuredDate,
        country: null,
        device: null,
      },
      { onConflict: "brand_id,keyword,url,country,device,measured_date" },
    );
  }
}

export async function syncGscConnectionRow(row: GscRow): Promise<{ rowsWritten: number }> {
  const result = await syncGscData({ connectionId: row.id });
  return { rowsWritten: result.dailyRows + result.queryRows };
}
