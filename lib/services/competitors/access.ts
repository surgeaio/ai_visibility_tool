import { hasPublicSupabaseEnv } from "@/lib/api/supabase-env";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminClient() {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return null;
  return admin;
}

export async function verifyBrandOwnedByUser(brandId: string, userId: string) {
  const admin = tryCreateAdminSupabaseClient();
  const supabase =
    admin ?? (hasPublicSupabaseEnv() ? await createServerSupabaseClient() : null);
  if (!supabase) return null;

  const { data: brand, error } = await supabase
    .from("brands")
    .select("id, name, website")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!brand) return null;
  return brand;
}
