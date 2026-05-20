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

function mapAnalysisRows(
  analyses: Array<{
    brand_id: string;
    prompt_id: string;
    ai_model: string;
    brand_mentioned: boolean | null;
    brand_position: number | null;
    brand_sentiment: number | null;
    run_date: string;
    created_at: string | null;
  }>,
): VisibilityPerfRow[] {
  return analyses.map((row) => {
    const mentioned = Boolean(row.brand_mentioned);
    const sentiment = row.brand_sentiment != null ? Number(row.brand_sentiment) : null;
    const position = row.brand_position != null ? Number(row.brand_position) : null;
    const runDate = row.run_date ?? (row.created_at as string).slice(0, 10);

    return {
      brand_id: row.brand_id,
      platform_id: null,
      prompt_id: row.prompt_id,
      visibility_score: visibilityFromMention(mentioned, position, sentiment),
      rank_position: position,
      measured_at: `${runDate}T12:00:00.000Z`,
      ai_model_slug: row.ai_model,
    };
  });
}

export async function loadVisibilityPerfRows(
  db: SupabaseClient<Database>,
  brandIds: string[],
  fromIso: string,
  fromDate: string,
): Promise<VisibilityPerfRow[]> {
  const primaryBrandId = brandIds[0];

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
  } else if (analyses?.length) {
    console.log(`[llm-visibility-data] chat_analysis: ${analyses.length} rows (primary source)`);
    return mapAnalysisRows(analyses);
  }

  const { count: recentResponseCount, error: respCountErr } = await db
    .from("chat_responses")
    .select("*", { count: "exact", head: true })
    .in("brand_id", brandIds)
    .gte("created_at", fromIso);

  if (!respCountErr && (recentResponseCount ?? 0) > 0) {
    console.log(
      `[llm-visibility-data] skipping stale llm_brand_performance — ${recentResponseCount} chat_responses in range but 0 chat_analysis`,
    );
    return [];
  }

  const { data: perfRows, error: perfError } = await db
    .from("llm_brand_performance")
    .select("brand_id, platform_id, prompt_id, visibility_score, rank_position, measured_at")
    .in("brand_id", brandIds)
    .gte("measured_at", fromIso)
    .order("measured_at", { ascending: true });

  if (perfError) {
    console.error("[llm-visibility-data] llm_brand_performance error:", perfError.message);
  } else if (perfRows?.length) {
    console.log(`[llm-visibility-data] llm_brand_performance fallback: ${perfRows.length} rows`);
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

  console.log("[llm-visibility-data] no visibility rows in range");
  return [];
}
