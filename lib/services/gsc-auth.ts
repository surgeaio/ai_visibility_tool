import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { getValidAccessToken } from "@/lib/services/gsc/token";

export type GscConnectionTokens = {
  connectionId: string;
  brandId: string;
  siteUrl: string;
  accessToken: string;
};

/**
 * Returns a valid GSC access token for a brand, refreshing when expired.
 */
export async function getValidGscTokens(brandId: string): Promise<GscConnectionTokens | null> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return null;

  const { data: conn, error } = await admin
    .from("gsc_connections")
    .select("id, brand_id, site_url, is_active")
    .eq("brand_id", brandId)
    .eq("is_active", true)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !conn) return null;

  const accessToken = await getValidAccessToken(conn.id);
  if (!accessToken) return null;

  return {
    connectionId: conn.id,
    brandId: conn.brand_id,
    siteUrl: conn.site_url,
    accessToken,
  };
}
