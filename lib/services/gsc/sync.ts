import { getGscDateRange } from "@/lib/google-rankings/gsc-dates";
import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { GoogleSearchConsoleService } from "@/lib/services/google-search-console";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { chunk } from "@/lib/utils/chunk";
import { getValidAccessToken } from "./token";

type GscRow = Database["public"]["Tables"]["gsc_connections"]["Row"];
type AdminClient = NonNullable<ReturnType<typeof tryCreateAdminSupabaseClient>>;

export interface SyncGscOptions {
  connectionId: string;
  daysBack?: number;
}

const UPSERT_CHUNK = 400;

async function upsertChunks(
  admin: AdminClient,
  table: "gsc_daily_metrics" | "gsc_query_rankings" | "google_rankings",
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<number> {
  if (!rows.length) return 0;
  let written = 0;
  for (const part of chunk(rows, UPSERT_CHUNK)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await admin.from(table).upsert(part as any, { onConflict });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    written += part.length;
  }
  return written;
}

export async function syncGscData({
  connectionId,
  daysBack = 28,
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
  if (!accessToken) throw new Error("Could not obtain valid access token — reconnect Search Console");

  const oauth = new GoogleOAuthService();
  const gsc = new GoogleSearchConsoleService(oauth.getAuthenticatedClient(accessToken));
  const siteUrl = conn.site_url;
  const { startDate, endDate } = getGscDateRange(daysBack);

  console.log(`[gsc-sync] ${siteUrl} ${startDate} → ${endDate} (web, ${daysBack}d)`);

  const propertyTotals = await gsc.getPropertyTotals(siteUrl, startDate, endDate, "web");
  console.log("[gsc-sync] property totals", {
    clicks: propertyTotals.clicks,
    impressions: propertyTotals.impressions,
    ctr: propertyTotals.ctr,
    position: propertyTotals.position,
  });

  const dailyAnalytics = await gsc.getSearchAnalyticsPaginated(siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    searchType: "web",
  });

  const dailyRowsPayload = dailyAnalytics.map((r) => ({
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

  const dailyRows = await upsertChunks(
    admin,
    "gsc_daily_metrics",
    dailyRowsPayload,
    "brand_id,site_url,metric_date",
  );
  console.log(`[gsc-sync] daily rows: ${dailyRows}`);

  const queryAnalytics = await gsc.getSearchAnalyticsPaginated(siteUrl, {
    startDate,
    endDate,
    dimensions: ["query", "page"],
    searchType: "web",
  });

  const queryRowsPayload = queryAnalytics
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

  let queryRows = 0;
  if (queryRowsPayload.length > 0) {
    queryRows = await upsertChunks(
      admin,
      "gsc_query_rankings",
      queryRowsPayload,
      "brand_id,site_url,metric_date,query,page_url",
    );
    console.log(`[gsc-sync] query rows: ${queryRows}`);

    await syncLegacyGoogleRankings(admin, conn, queryRowsPayload, endDate);
  }

  const distinctPages = new Set(queryRowsPayload.map((r) => r.page_url)).size;
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

  console.log("[gsc-sync] done", { dailyRows, queryRows });
  return { dailyRows, queryRows };
}

async function syncLegacyGoogleRankings(
  admin: AdminClient,
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
  const legacyRows = queryRows.map((r) => ({
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
  }));

  const n = await upsertChunks(
    admin,
    "google_rankings",
    legacyRows,
    "brand_id,keyword,url,country,device,measured_date",
  );
  console.log(`[gsc-sync] legacy google_rankings: ${n}`);
}

export async function syncGscConnectionRow(row: GscRow): Promise<{ rowsWritten: number }> {
  const result = await syncGscData({ connectionId: row.id });
  return { rowsWritten: result.dailyRows + result.queryRows };
}
