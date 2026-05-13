import { decryptApiKey, encryptApiKey } from "@/lib/crypto/encryption";
import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { GoogleSearchConsoleService } from "@/lib/services/google-search-console";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type GscRow = Database["public"]["Tables"]["gsc_connections"]["Row"];

export async function syncGscConnection(row: GscRow): Promise<{ rowsWritten: number }> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return { rowsWritten: 0 };

  const oauth = new GoogleOAuthService();
  let accessToken = decryptApiKey(row.access_token_encrypted);
  const refreshToken = decryptApiKey(row.refresh_token_encrypted);

  const expires = row.token_expires_at ? new Date(row.token_expires_at) : null;
  if (!expires || expires.getTime() < Date.now() + 120_000) {
    const refreshed = await oauth.refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    await admin
      .from("gsc_connections")
      .update({
        access_token_encrypted: encryptApiKey(accessToken),
        token_expires_at: refreshed.expiresAt.toISOString(),
      })
      .eq("id", row.id);
  }

  const gsc = new GoogleSearchConsoleService(oauth.getAuthenticatedClient(accessToken));
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const analytics = await gsc.getSearchAnalytics(row.site_url, {
    startDate,
    endDate,
    dimensions: ["query", "page"],
    rowLimit: 2500,
  });

  let rowsWritten = 0;
  for (const r of analytics) {
    const keyword = r.keys[0] ?? "";
    const pageUrl = r.keys[1] ?? "";
    if (!keyword || !pageUrl) continue;
    const { error } = await admin.from("google_rankings").upsert(
      {
        brand_id: row.brand_id,
        keyword,
        url: pageUrl,
        position: r.position,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        click_through_rate: r.ctr,
        measured_date: endDate,
        country: null,
        device: null,
      },
      { onConflict: "brand_id,keyword,url,country,device,measured_date" },
    );
    if (!error) rowsWritten += 1;
  }

  await admin
    .from("gsc_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", row.id);

  return { rowsWritten };
}

export async function syncAllActiveGscConnections(): Promise<{ connections: number; rows: number }> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return { connections: 0, rows: 0 };

  const { data, error } = await admin.from("gsc_connections").select("*").eq("is_active", true);
  if (error || !data?.length) return { connections: 0, rows: 0 };

  let rows = 0;
  for (const row of data as GscRow[]) {
    try {
      const r = await syncGscConnection(row);
      rows += r.rowsWritten;
    } catch (e) {
      console.error("[gsc-sync] connection", row.id, e);
    }
  }
  return { connections: data.length, rows };
}
