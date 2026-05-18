import { encryptApiKey } from "@/lib/crypto/encryption";
import { getAppBaseUrl } from "@/lib/auth/google-oauth-config";
import { getGscSyncQueue } from "@/lib/queues/gsc-sync.queue";
import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { GoogleSearchConsoleService } from "@/lib/services/google-search-console";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function rankingsUrl(base: string, query: Record<string, string>): string {
  const u = new URL("/dashboard/google-rankings", base);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
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

export async function handleGoogleGscOAuthCallback(req: NextRequest): Promise<NextResponse> {
  const base = getAppBaseUrl();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateEnc = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  console.info("[gsc-oauth-callback]", {
    path: url.pathname,
    hasCode: Boolean(code),
    hasState: Boolean(stateEnc),
    error: oauthError ?? null,
  });

  if (oauthError) {
    return NextResponse.redirect(rankingsUrl(base, { error: oauthError }));
  }

  if (!code || !stateEnc) {
    return NextResponse.redirect(rankingsUrl(base, { error: "missing_code" }));
  }

  let brandId: string;
  try {
    const raw = Buffer.from(stateEnc, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as { brandId?: string };
    if (!parsed.brandId) throw new Error("missing brand");
    brandId = parsed.brandId;
  } catch {
    return NextResponse.redirect(rankingsUrl(base, { error: "bad_state" }));
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", base);
    login.searchParams.set("next", "/dashboard/google-rankings");
    return NextResponse.redirect(login.toString());
  }

  try {
    const oauth = new GoogleOAuthService();
    const tokens = await oauth.exchangeCode(code);
    const authClient = oauth.getAuthenticatedClient(tokens.accessToken);
    const gsc = new GoogleSearchConsoleService(authClient);
    const sites = await gsc.listSites();

    if (!sites.length) {
      return NextResponse.redirect(rankingsUrl(base, { error: "no_properties" }));
    }

    const admin = tryCreateAdminSupabaseClient();
    const db = admin ?? supabase;

    const { data: brand, error: brandErr } = await db
      .from("brands")
      .select("id, website")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (brandErr) {
      console.error("[gsc-oauth-callback] brand lookup:", brandErr.message);
      return NextResponse.redirect(rankingsUrl(base, { error: "db_error" }));
    }

    if (!brand) {
      return NextResponse.redirect(rankingsUrl(base, { error: "invalid_brand" }));
    }

    const siteUrl = matchSiteToBrand(sites, brand.website);
    const googleEmail = await fetchGoogleEmail(tokens.accessToken);

    const row = {
      user_id: user.id,
      brand_id: brandId,
      site_url: siteUrl,
      google_email: googleEmail || null,
      access_token_encrypted: encryptApiKey(tokens.accessToken),
      refresh_token_encrypted: encryptApiKey(tokens.refreshToken),
      token_expires_at: tokens.expiresAt.toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await db.from("gsc_connections").upsert(row, {
      onConflict: "user_id,site_url",
    });

    if (upsertErr) {
      console.error("[gsc-oauth-callback] upsert failed:", upsertErr.message, upsertErr.code);
      return NextResponse.redirect(rankingsUrl(base, { error: "db_error" }));
    }

    console.info("[gsc-oauth-callback] connected", { userId: user.id, brandId, siteUrl });

    const { data: connRow } = await db
      .from("gsc_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("brand_id", brandId)
      .eq("site_url", siteUrl)
      .maybeSingle();

    const queue = getGscSyncQueue();
    if (queue && connRow?.id) {
      void queue
        .add(
          "gsc-sync",
          { brandId, userId: user.id, connectionId: connRow.id, daysBack: 28 },
          { attempts: 2, removeOnComplete: 500 },
        )
        .catch((err) => console.error("[gsc-oauth-callback] queue sync failed:", err));
    } else if (!queue) {
      console.warn("[gsc-oauth-callback] Redis queue unavailable — run sync manually from dashboard");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[gsc-oauth-callback] token exchange failed:", message);
    const code =
      message.includes("redirect_uri") || message.includes("redirect")
        ? "redirect_mismatch"
        : "oauth_failed";
    return NextResponse.redirect(rankingsUrl(base, { error: code }));
  }

  return NextResponse.redirect(rankingsUrl(base, { connected: "true" }));
}
