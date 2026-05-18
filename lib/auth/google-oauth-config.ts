/**
 * Canonical redirect URI for Google Search Console OAuth (must match Google Cloud Console exactly).
 * Primary path: /api/auth/callback/google
 * Legacy alias:  /api/auth/google/callback (still supported)
 */
export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!raw) return "http://localhost:3000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

export function getGoogleGscRedirectUri(): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${getAppBaseUrl()}/api/auth/callback/google`;
}

/** Legacy path kept for backwards compatibility with older env/docs. */
export const GOOGLE_GSC_CALLBACK_PATH_LEGACY = "/api/auth/google/callback";
export const GOOGLE_GSC_CALLBACK_PATH = "/api/auth/callback/google";
