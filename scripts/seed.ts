/**
 * Optional database seed for local Supabase. Requires SUPABASE_SERVICE_ROLE_KEY and matching schema.
 * Demo UI works without this script when DEMO_MODE / auth bypass is enabled.
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    console.log("[seed] Skip: SUPABASE_SERVICE_ROLE_KEY not set. Use demo mode or configure Supabase first.");
    process.exit(0);
  }

  const admin = createAdminSupabaseClient();
  const { data: orgs, error: orgErr } = await admin.from("organizations").select("id").limit(1);
  if (orgErr) {
    console.error("[seed] organizations query failed:", orgErr.message);
    process.exit(1);
  }
  if (orgs?.length) {
    console.log("[seed] Data already present; skipping destructive seed.");
    process.exit(0);
  }

  console.log("[seed] Insert minimal org/brand rows via SQL editor or extend this script when auth users exist.");
  process.exit(0);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
