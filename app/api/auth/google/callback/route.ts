import { encryptApiKey } from "@/lib/crypto/encryption";
import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { GoogleSearchConsoleService } from "@/lib/services/google-search-console";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateEnc = url.searchParams.get("state");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !stateEnc) {
    return NextResponse.redirect(`${base}/dashboard/settings/api-keys?gsc=error`);
  }

  let brandId: string;
  try {
    const raw = Buffer.from(stateEnc, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { brandId?: string };
    if (!parsed.brandId) throw new Error("missing brand");
    brandId = parsed.brandId;
  } catch {
    return NextResponse.redirect(`${base}/dashboard/settings/api-keys?gsc=bad_state`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${base}/login?next=/dashboard/settings/api-keys`);
  }

  try {
    const oauth = new GoogleOAuthService();
    const tokens = await oauth.exchangeCode(code);
    const authClient = oauth.getAuthenticatedClient(tokens.accessToken);
    const gsc = new GoogleSearchConsoleService(authClient);
    const sites = await gsc.listSites();
    const siteUrl = sites[0]?.siteUrl ?? "sc-domain:unverified";

    const { error } = await supabase.from("gsc_connections").insert({
      user_id: user.id,
      brand_id: brandId,
      site_url: siteUrl,
      access_token_encrypted: encryptApiKey(tokens.accessToken),
      refresh_token_encrypted: encryptApiKey(tokens.refreshToken),
      token_expires_at: tokens.expiresAt.toISOString(),
      is_active: true,
    });
    if (error) {
      console.error("[gsc callback]", error.message);
      return NextResponse.redirect(`${base}/dashboard/settings/api-keys?gsc=db_error`);
    }
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${base}/dashboard/settings/api-keys?gsc=token_error`);
  }

  return NextResponse.redirect(`${base}/dashboard/settings/api-keys?gsc=connected`);
}
