import { handleGoogleGscOAuthCallback } from "@/lib/auth/google-gsc-callback";
import type { NextRequest } from "next/server";

/** Node runtime required for googleapis token exchange. */
export const runtime = "nodejs";

/**
 * Primary Google Search Console OAuth callback.
 * Must match GOOGLE_REDIRECT_URI / Google Cloud Console authorized redirect URI.
 */
export async function GET(req: NextRequest) {
  return handleGoogleGscOAuthCallback(req);
}
