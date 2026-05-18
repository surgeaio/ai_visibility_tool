import { decryptApiKey, encryptApiKey } from "@/lib/crypto/encryption";
import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getValidAccessToken(connectionId: string): Promise<string | null> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return null;

  const { data: conn, error } = await admin
    .from("gsc_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !conn) return null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  const now = Date.now();

  if (expiresAt > now + 5 * 60 * 1000) {
    return decryptApiKey(conn.access_token_encrypted);
  }

  try {
    const refreshToken = decryptApiKey(conn.refresh_token_encrypted);
    const oauth = new GoogleOAuthService();
    const refreshed = await oauth.refreshAccessToken(refreshToken);

    await admin
      .from("gsc_connections")
      .update({
        access_token_encrypted: encryptApiKey(refreshed.accessToken),
        token_expires_at: refreshed.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    return refreshed.accessToken;
  } catch (e) {
    console.error("[gsc-token] refresh failed:", e);
    await admin.from("gsc_connections").update({ is_active: false }).eq("id", connectionId);
    return null;
  }
}
