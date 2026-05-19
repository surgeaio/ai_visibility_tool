import WebSocket from "ws";
import type { SupabaseClientOptions } from "@supabase/supabase-js";

/** Supabase client options for Node.js < 22 (no native WebSocket). */
type RealtimeTransport = NonNullable<
  NonNullable<SupabaseClientOptions<"public">["realtime"]>["transport"]
>;

export const nodeSupabaseClientOptions: SupabaseClientOptions<"public"> = {
  realtime: {
    transport: WebSocket as RealtimeTransport,
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};
