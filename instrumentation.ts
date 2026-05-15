/**
 * Runs once when the Node server boots (not during `next build` unless assertions enabled).
 * On Vercel **production** (`VERCEL_ENV=production`), fails fast if critical env is wrong.
 */
export function register() {
  const assert =
    process.env.VERCEL_ENV === "production" || process.env.PRODUCTION_ENV_ASSERTION === "true";
  if (!assert) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error(
      "[production] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — set in the host environment.",
    );
  }

  const enc = process.env.ENCRYPTION_KEY?.trim();
  if (!enc || !/^[a-fA-F0-9]{64}$/.test(enc)) {
    throw new Error(
      "[production] ENCRYPTION_KEY must be exactly 64 hex characters (openssl rand -hex 32).",
    );
  }

  if (process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    throw new Error(
      "[production] DEMO_MODE and NEXT_PUBLIC_DEMO_MODE must be false or unset for real deployments.",
    );
  }
}
