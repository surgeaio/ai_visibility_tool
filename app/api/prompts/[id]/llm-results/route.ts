import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { promptIdParamSchema } from "@/lib/validators";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    return Response.json({ results: [], requestId });
  }

  const promptId = paramValidation.data.id;

  const { data: rows, error } = await admin
    .from("llm_brand_performance")
    .select(
      "visibility_score, sentiment, sentiment_score, raw_response, context, measured_at, platform_id, is_mentioned",
    )
    .eq("prompt_id", promptId)
    .order("measured_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message, requestId }, { status: 500 });
  }

  const platformIds = [...new Set((rows ?? []).map((r) => r.platform_id).filter(Boolean))] as string[];
  const { data: plats } = await admin.from("llm_platforms").select("id, display_name").in("id", platformIds);
  const platMap = new Map((plats ?? []).map((p) => [p.id as string, p.display_name as string]));

  const results = (rows ?? []).map((r) => ({
    platform: platMap.get(r.platform_id as string) ?? "Unknown",
    visibilityScore: r.visibility_score,
    sentiment: r.sentiment,
    sentimentScore: r.sentiment_score,
    rawResponse: r.raw_response,
    context: r.context,
    isMentioned: r.is_mentioned,
    measuredAt: r.measured_at,
  }));

  return Response.json({ results, requestId });
}
