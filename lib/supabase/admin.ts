import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { nodeSupabaseClientOptions } from "@/lib/supabase/node-client-options";

/**
 * Service-role Supabase client (bypasses RLS). Use only on the server for admin jobs and seeding.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, key, nodeSupabaseClientOptions);
}

/** Workers / cron use this when service role is optional (demo/local without DB). */
export function tryCreateAdminSupabaseClient(): ReturnType<typeof createClient<Database>> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  return createClient<Database>(url, key, nodeSupabaseClientOptions);
}
