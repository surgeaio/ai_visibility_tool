import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { analyticsQuerySchema } from "@/lib/validators/analytics.schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_LLM_FORECAST_SERIES, DEMO_KEYWORD_RANK_FORECAST } from "@/lib/demo/seed-data";

function linearNext(values: number[]): { next: number[]; slope: number } {
  if (values.length < 2) return { next: [values[0] ?? 0, values[0] ?? 0, values[0] ?? 0], slope: 0 };
  const n = values.length;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    const x = i;
    const y = values[i] ?? 0;
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const next = [1, 2, 3].map((h) => Math.min(100, Math.max(0, intercept + slope * (n - 1 + h * 7))));
  return { next, slope };
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, analyticsQuerySchema, requestId);
  if (!q.success) return q.response;
  const { brandId, range } = q.data;

  if (isAuthBypassMode()) {
    return Response.json({
      source: "demo" as const,
      llmForecast: DEMO_LLM_FORECAST_SERIES,
      keywordForecast: DEMO_KEYWORD_RANK_FORECAST,
      requestId,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const from = new Date(Date.now() - days * 86400_000).toISOString();

    const { data: perf, error } = await supabase
      .from("llm_brand_performance")
      .select("measured_at, visibility_score")
      .eq("brand_id", brandId)
      .gte("measured_at", from)
      .order("measured_at", { ascending: true });
    if (error) return serverErrorResponse(error.message, requestId);

    const byDay = new Map<string, number[]>();
    for (const row of perf ?? []) {
      if (!row.measured_at || row.visibility_score == null) continue;
      const day = row.measured_at.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(Number(row.visibility_score));
      byDay.set(day, list);
    }
    const series = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, vals]) => ({
        label,
        score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      }));

    const values = series.map((s) => s.score);
    const { next } = linearNext(values);
    const llmForecast = [
      ...series,
      { label: "+30d", score: Math.round(next[0] ?? 0) },
      { label: "+60d", score: Math.round(next[1] ?? 0) },
      { label: "+90d", score: Math.round(next[2] ?? 0) },
    ];

    return Response.json({
      source: "live" as const,
      llmForecast,
      keywordForecast: [] as { keyword: string; now: number; d30: number; d60: number }[],
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed predictive analytics", requestId);
  }
}
