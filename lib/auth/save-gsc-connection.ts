import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type GscConnectionUpsertRow = {
  user_id: string;
  brand_id: string;
  site_url: string;
  google_email: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  is_active: boolean;
  updated_at: string;
};

/**
 * Persists GSC OAuth tokens. Tries brand-scoped upsert first, then legacy user+site constraint.
 */
export async function saveGscConnection(
  db: SupabaseClient<Database>,
  row: GscConnectionUpsertRow,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!row.site_url?.trim()) {
    return { ok: false, message: "No Search Console property URL to save" };
  }

  const conflictAttempts = ["brand_id,site_url", "user_id,site_url"] as const;

  for (const onConflict of conflictAttempts) {
    const { error } = await db.from("gsc_connections").upsert(row, { onConflict });
    if (!error) return { ok: true };
    console.warn("[gsc-save] upsert failed", { onConflict, code: error.code, message: error.message });
  }

  const { data: byBrand } = await db
    .from("gsc_connections")
    .select("id")
    .eq("brand_id", row.brand_id)
    .eq("site_url", row.site_url)
    .maybeSingle();

  if (byBrand?.id) {
    const { error } = await db.from("gsc_connections").update(row).eq("id", byBrand.id);
    if (!error) return { ok: true };
    console.error("[gsc-save] update by brand failed:", error.message);
  }

  const { data: byUserSite } = await db
    .from("gsc_connections")
    .select("id")
    .eq("user_id", row.user_id)
    .eq("site_url", row.site_url)
    .maybeSingle();

  if (byUserSite?.id) {
    const { error } = await db.from("gsc_connections").update(row).eq("id", byUserSite.id);
    if (!error) return { ok: true };
    console.error("[gsc-save] update by user+site failed:", error.message);
  }

  const { error: insertErr } = await db.from("gsc_connections").insert(row);
  if (!insertErr) return { ok: true };

  return { ok: false, message: insertErr.message };
}
