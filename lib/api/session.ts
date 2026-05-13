import { isAuthBypassMode } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Stable pseudo-id for demo API flows (not persisted as auth user). */
export const DEMO_AUTH_USER_ID = "00000000-0000-4000-a000-000000000001";

export async function getAuthedUserId(): Promise<string | null> {
  if (isAuthBypassMode()) {
    return DEMO_AUTH_USER_ID;
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
