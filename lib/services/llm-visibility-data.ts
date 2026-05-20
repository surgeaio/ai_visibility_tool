import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type VisibilityPerfRow = {
  brand_id: string;
  platform_id: string | null;
  prompt_id: string | null;
  visibility_score: number | null;
  rank_position: number | null;
  measured_at: string | null;
  ai_model_slug?: string | null;
};

const MODEL_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export function modelLabelFromSlug(slug: string): string {
  return MODEL_LABELS[slug] ?? slug;
}

function visibilityFromMention(mentioned: boolean, position: number | null, sentiment: number | null): number {
  let score = 0;
  if (mentioned) score += 42;
  if (position != null) score += Math.max(0, 28 - (position - 1) * 6);
  if (sentiment != null) score += sentiment * 0.22;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function loadVisibilityPerfRows(
  db: SupabaseClient<Database>,
  brandIds: string[],
  fromIso: string,
  fromDate: string,
): Promise<VisibilityPerfRow[]> {
  const primaryBrandId = brandIds[0];

  const { data: perfRows, error: perfError } = await db
    .from("llm_brand_performance")
    .select("brand_id, platform_id, prompt_id, visibility_score, rank_position, measured_at")
    .in("brand_id", brandIds)
    .gte("measured_at", fromIso)
    .order("measured_at", { ascending: true });

  if (perfError) {
    console.error("[llm-visibility-data] llm_brand_performance error:", perfError.message);
  } else if (perfRows?.length) {
    console.log(`[llm-visibility-data] llm_brand_performance: ${perfRows.length} rows`);
    return perfRows as VisibilityPerfRow[];
  }

  const { data: dailyMetrics, error: dailyError } = await db
    .from("brand_daily_metrics")
    .select("brand_id, metric_date, visibility_pct, avg_position, ai_model")
    .eq("brand_id", primaryBrandId)
    .eq("ai_model", "all")
    .gte("metric_date", fromDate)
    .order("metric_date", { ascending: true });

  if (dailyError) {
    console.error("[llm-visibility-data] brand_daily_metrics error:", dailyError.message);
  } else if (dailyMetrics?.length) {
    console.log(`[llm-visibility-data] brand_daily_metrics: ${dailyMetrics.length} rows`);
    return dailyMetrics.map((row) => ({
      brand_id: row.brand_id,
      platform_id: null,
      prompt_id: null,
      visibility_score: row.visibility_pct != null ? Number(row.visibility_pct) : null,
      rank_position: row.avg_position != null ? Number(row.avg_position) : null,
      measured_at: `${row.metric_date}T12:00:00.000Z`,
      ai_model_slug: "all",
    }));
  }

  const { data: analyses, error: analysisError } = await db
    .from("chat_analysis")
    .select(
      "brand_id, prompt_id, ai_model, brand_mentioned, brand_position, brand_sentiment, run_date, created_at",
    )
    .in("brand_id", brandIds)
    .gte("created_at", fromIso)
    .order("created_at", { ascending: true });

  if (analysisError) {
    console.error("[llm-visibility-data] chat_analysis error:", analysisError.message);
    return [];
  }

  console.log(`[llm-visibility-data] chat_analysis fallback: ${analyses?.length ?? 0} rows`);

  return (analyses ?? []).map((row) => {
    const mentioned = Boolean(row.brand_mentioned);
    const sentiment =
      row.brand_sentiment != null ? Number(row.brand_sentiment) : null;
    const position =
      row.brand_position != null ? Number(row.brand_position) : null;
    const runDate = (row.run_date as string) ?? (row.created_at as string).slice(0, 10);

    return {
      brand_id: row.brand_id as string,
      platform_id: null,
      prompt_id: row.prompt_id as string,
      visibility_score: visibilityFromMention(mentioned, position, sentiment),
      rank_position: position,
      measured_at: `${runDate}T12:00:00.000Z`,
      ai_model_slug: row.ai_model as string,
    };
  });
}
