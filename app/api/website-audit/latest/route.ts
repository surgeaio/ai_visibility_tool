import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { googleRankingsQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_WEBSITE_AUDIT_SUMMARY } from "@/lib/demo/seed-data";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, googleRankingsQuerySchema, requestId);
  if (!q.success) return q.response;
  const { brandId } = q.data;

  if (isAuthBypassMode()) {
    return Response.json({
      source: "demo" as const,
      summary: DEMO_WEBSITE_AUDIT_SUMMARY,
      requestId,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("website_audits")
      .select("*")
      .eq("brand_id", brandId)
      .order("audit_completed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) return serverErrorResponse(error.message, requestId);
    if (!data) {
      return Response.json({ source: "live" as const, empty: true, summary: null, requestId });
    }

    return Response.json({
      source: "live" as const,
      summary: {
        overallScore: data.overall_score,
        critical: data.critical_issues,
        warnings: data.warnings,
        totalPages: data.total_pages,
        indexed: null,
        notIndexed: null,
        crawlProgress: data.crawl_progress,
        completedAt: data.audit_completed_at,
      },
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to load audit", requestId);
  }
}
