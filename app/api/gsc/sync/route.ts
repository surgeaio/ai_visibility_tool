import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncGscConnection } from "@/lib/services/gsc-sync";
import type { Database } from "@/lib/supabase/database.types";

const bodySchema = z.object({ brandId: z.string().min(1) });

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const parsed = await validateBody(req, bodySchema, requestId);
  if (!parsed.success) return parsed.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("gsc_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("brand_id", parsed.data.brandId)
      .eq("is_active", true)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return serverErrorResponse(error.message, requestId);
    if (!data) {
      return Response.json(
        { error: "No Google Search Console connection for this brand.", requestId },
        { status: 400 },
      );
    }

    const row = data as Database["public"]["Tables"]["gsc_connections"]["Row"];
    const result = await syncGscConnection(row);
    return Response.json({ ok: true as const, rowsWritten: result.rowsWritten, requestId });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("GSC sync failed", requestId);
  }
}
