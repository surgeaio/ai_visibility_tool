import { isAuthBypassMode } from "@/lib/config";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ brandId: z.string().min(1) });

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, schema, requestId);
  if (!q.success) return q.response;

  if (isAuthBypassMode()) {
    return Response.json({
      connected: false,
      lastSyncedAt: null as string | null,
      siteUrl: null as string | null,
      source: "demo" as const,
      requestId,
    });
  }

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("gsc_connections")
      .select("last_synced_at, site_url")
      .eq("user_id", userId)
      .eq("brand_id", q.data.brandId)
      .eq("is_active", true)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return Response.json({ error: error.message, requestId }, { status: 500 });
    }
    return Response.json({
      connected: !!data,
      lastSyncedAt: data?.last_synced_at ?? null,
      siteUrl: data?.site_url ?? null,
      source: "live" as const,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load GSC status", requestId }, { status: 500 });
  }
}
