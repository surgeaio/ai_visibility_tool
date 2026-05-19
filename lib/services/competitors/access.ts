import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminClient() {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return admin;
}

export async function verifyBrandOwnedByUser(brandId: string, userId: string) {
  const admin = tryCreateAdminSupabaseClient();
  const supabase = admin ?? (await createServerSupabaseClient());

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
