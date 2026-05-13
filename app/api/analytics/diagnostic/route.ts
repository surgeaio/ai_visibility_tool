import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { analyticsQuerySchema } from "@/lib/validators/analytics.schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function rangeToMs(range: "7d" | "30d" | "90d"): number {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return days * 86400_000;
}

async function avgLlmScore(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  brandId: string,
  start: Date,
  end: Date,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("llm_brand_performance")
    .select("visibility_score")
    .eq("brand_id", brandId)
    .gte("measured_at", start.toISOString())
    .lte("measured_at", end.toISOString());
  if (error) throw new Error(error.message);
  const vals = (data ?? []).map((r) => Number(r.visibility_score ?? 0)).filter((n) => !Number.isNaN(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, analyticsQuerySchema, requestId);
  if (!q.success) return q.response;
  const { brandId, range } = q.data;

  if (isAuthBypassMode()) {
    return Response.json({
      source: "demo" as const,
      reasons: [
        "LLM visibility improved after publishing comparison pages (demo narrative).",
        "Google average position moved up as CTR tests landed on high-impression queries.",
        "Website warnings dropped once missing meta descriptions were filled in.",
      ],
      llmDeltaPct: 6.2,
      googleCtrDeltaPct: 12,
      requestId,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const total = rangeToMs(range);
    const mid = new Date(Date.now() - total / 2);
    const end = new Date();
    const start = new Date(Date.now() - total);

    const [early, late] = await Promise.all([
      avgLlmScore(supabase, brandId, start, mid),
      avgLlmScore(supabase, brandId, mid, end),
    ]);

    const llmDeltaPct =
      early != null && late != null && early > 0 ? Number((((late - early) / early) * 100).toFixed(1)) : null;

    const reasons: string[] = [];
    if (llmDeltaPct != null) {
      if (llmDeltaPct > 2) reasons.push("LLM visibility scores rose in the more recent half of the window.");
      else if (llmDeltaPct < -2) reasons.push("LLM visibility scores softened in the more recent half—review prompts and mentions.");
      else reasons.push("LLM visibility stayed relatively steady across the two halves of the window.");
    } else {
      reasons.push("Not enough LLM performance rows to compare halves yet.");
    }
    reasons.push("Connect Google Search Console to explain organic click moves with query-level data.");
    reasons.push("Run fresh site crawls after large content or template changes to explain technical shifts.");

    return Response.json({
      source: "live" as const,
      reasons,
      llmDeltaPct,
      googleCtrDeltaPct: null as number | null,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed diagnostic analytics", requestId);
  }
}
