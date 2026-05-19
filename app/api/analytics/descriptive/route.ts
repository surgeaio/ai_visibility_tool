export const dynamic = "force-dynamic";

import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { analyticsQuerySchema } from "@/lib/validators/analytics.schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEMO_GOOGLE_SUMMARY,
  DEMO_LLM_PLATFORM_SCORES,
  DEMO_WEBSITE_AUDIT_SUMMARY,
} from "@/lib/demo/seed-data";

function rangeToMs(range: "7d" | "30d" | "90d"): number {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return days * 86400_000;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, analyticsQuerySchema, requestId);
  if (!q.success) return q.response;
  const { brandId, range } = q.data;

  if (isAuthBypassMode()) {
    const llmOverall = Math.round(
      DEMO_LLM_PLATFORM_SCORES.reduce((a, p) => a + p.score, 0) / DEMO_LLM_PLATFORM_SCORES.length,
    );
    return Response.json({
      source: "demo" as const,
      llm: { overall: llmOverall, runs: 120 },
      google: {
        avgPosition: DEMO_GOOGLE_SUMMARY.avgPosition,
        clicks: DEMO_GOOGLE_SUMMARY.clicks,
        impressions: DEMO_GOOGLE_SUMMARY.impressions,
        ctr: DEMO_GOOGLE_SUMMARY.ctr,
      },
      website: {
        overallScore: DEMO_WEBSITE_AUDIT_SUMMARY.overallScore,
        critical: DEMO_WEBSITE_AUDIT_SUMMARY.critical,
        warnings: DEMO_WEBSITE_AUDIT_SUMMARY.warnings,
        totalPages: DEMO_WEBSITE_AUDIT_SUMMARY.totalPages,
      },
      requestId,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const from = new Date(Date.now() - rangeToMs(range)).toISOString();

    const { data: perf, error: pErr } = await supabase
      .from("llm_brand_performance")
      .select("visibility_score")
      .eq("brand_id", brandId)
      .gte("measured_at", from);
    if (pErr) return serverErrorResponse(pErr.message, requestId);
    const scores = (perf ?? []).map((r) => Number(r.visibility_score ?? 0)).filter((n) => !Number.isNaN(n));
    const llmOverall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const fromDay = from.slice(0, 10);
    const { data: gr, error: gErr } = await supabase
      .from("google_rankings")
      .select("position, impressions, clicks, ctr")
      .eq("brand_id", brandId)
      .gte("measured_date", fromDay);
    if (gErr) return serverErrorResponse(gErr.message, requestId);
    const gRows = gr ?? [];
    const gImpr = gRows.reduce((a, r) => a + (r.impressions ?? 0), 0);
    const gClicks = gRows.reduce((a, r) => a + (r.clicks ?? 0), 0);
    const gWeighted = gRows.reduce((a, r) => a + Number(r.position ?? 0) * (r.impressions ?? 0), 0);
    const google =
      gRows.length > 0
        ? {
            avgPosition: gImpr > 0 ? Number((gWeighted / gImpr).toFixed(2)) : 0,
            clicks: gClicks,
            impressions: gImpr,
            ctr: gImpr > 0 ? gClicks / gImpr : 0,
          }
        : null;

    const { data: audit } = await supabase
      .from("website_audits")
      .select("overall_score, critical_issues, warnings, total_pages")
      .eq("brand_id", brandId)
      .order("audit_completed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const website = audit
      ? {
          overallScore: audit.overall_score ?? 0,
          critical: audit.critical_issues ?? 0,
          warnings: audit.warnings ?? 0,
          totalPages: audit.total_pages ?? 0,
        }
      : null;

    return Response.json({
      source: "live" as const,
      llm: { overall: llmOverall, runs: scores.length },
      google,
      website,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed descriptive analytics", requestId);
  }
}
