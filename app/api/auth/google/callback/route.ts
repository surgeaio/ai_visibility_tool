import { encryptApiKey } from "@/lib/crypto/encryption";
import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { GoogleSearchConsoleService } from "@/lib/services/google-search-console";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function appBase(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? new URL(req.url).origin;
}

function matchSiteToBrand(sites: { siteUrl: string }[], website: string | null): string {
  if (!website?.trim() || sites.length === 0) return sites[0]?.siteUrl ?? "";
  try {
    const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(
      /^www\./,
      "",
    );
    const match = sites.find((s) => s.siteUrl.includes(host));
    return match?.siteUrl ?? sites[0].siteUrl;
  } catch {
    return sites[0]?.siteUrl ?? "";
  }
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { email?: string };
    return data.email ?? "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const base = appBase(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateEnc = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${base}/dashboard/google-rankings?error=${oauthError}`);
  }

  if (!code || !stateEnc) {
    return NextResponse.redirect(`${base}/dashboard/google-rankings?error=missing_code`);
  }

  let brandId: string;
  try {
    const raw = Buffer.from(stateEnc, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { brandId?: string };
    if (!parsed.brandId) throw new Error("missing brand");
    brandId = parsed.brandId;
  } catch {
    return NextResponse.redirect(`${base}/dashboard/google-rankings?error=bad_state`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${base}/login?next=/dashboard/google-rankings`);
  }

  try {
    const oauth = new GoogleOAuthService();
    const tokens = await oauth.exchangeCode(code);
    const authClient = oauth.getAuthenticatedClient(tokens.accessToken);
    const gsc = new GoogleSearchConsoleService(authClient);
    const sites = await gsc.listSites();

    if (!sites.length) {
      return NextResponse.redirect(`${base}/dashboard/google-rankings?error=no_properties`);
    }

    const admin = createAdminSupabaseClient();
    const { data: brand } = await admin
      .from("brands")
      .select("id, website")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!brand) {
      return NextResponse.redirect(`${base}/dashboard/google-rankings?error=invalid_brand`);
    }

    const siteUrl = matchSiteToBrand(sites, brand.website);
    const googleEmail = await fetchGoogleEmail(tokens.accessToken);

    const { error } = await admin.from("gsc_connections").upsert(
      {
        user_id: user.id,
        brand_id: brandId,
        site_url: siteUrl,
        google_email: googleEmail || null,
        access_token_encrypted: encryptApiKey(tokens.accessToken),
        refresh_token_encrypted: encryptApiKey(tokens.refreshToken),
        token_expires_at: tokens.expiresAt.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,site_url" },
    );

    if (error) {
      console.error("[gsc callback]", error.message);
      return NextResponse.redirect(`${base}/dashboard/google-rankings?error=db_error`);
    }

    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
      void fetch(`${base}/api/gsc/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brandId }),
      }).catch((err) => console.error("[gsc-oauth] initial sync trigger failed:", err));
    }
  } catch (e) {
    console.error("[gsc callback]", e);
    return NextResponse.redirect(`${base}/dashboard/google-rankings?error=oauth_failed`);
  }

  return NextResponse.redirect(`${base}/dashboard/google-rankings?connected=true`);
}
