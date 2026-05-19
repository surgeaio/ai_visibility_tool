import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { nodeSupabaseClientOptions } from "@/lib/supabase/node-client-options";

let workerSupabaseClient: SupabaseClient<Database> | null = null;

/** Singleton Supabase admin client for BullMQ workers (Node.js 20 WebSocket transport). */
export function getWorkerSupabaseClient(): SupabaseClient<Database> {
  if (workerSupabaseClient) return workerSupabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error(
      "[Worker] Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  workerSupabaseClient = createClient<Database>(
    supabaseUrl,
    supabaseKey,
    nodeSupabaseClientOptions,
  ) as SupabaseClient<Database>;
  return workerSupabaseClient;
}

/** Like getWorkerSupabaseClient but returns null when env is not configured. */
export function tryGetWorkerSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) return null;
  return getWorkerSupabaseClient();
}
