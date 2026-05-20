export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { reanalyzeBrandResponses } from "@/lib/services/visibility-orchestrator";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 120;

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const body = (await req.json()) as { brandId?: string };
    const brandId = body.brandId;
    if (!brandId) {
      return Response.json({ error: "brandId required", requestId }, { status: 400 });
    }

    const userClient = await createServerSupabaseClient();
    const { data: brand } = await userClient
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!brand) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const result = await reanalyzeBrandResponses(brandId);
    return Response.json({ success: true, ...result, requestId });
  } catch (err) {
    console.error("[/api/visibility/reanalyze]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Re-analyze failed", requestId },
      { status: 500 },
    );
  }
}
