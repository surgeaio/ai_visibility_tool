import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BrandForDetection } from "@/lib/services/brand-mention-detector";
import {
  analyzeResponse,
  analyzeResponseLocal,
  type AnalyzerInput,
  type AnalyzerOutput,
} from "@/lib/services/response-analyzer";
import type { AIModelName } from "@/lib/services/ai-executor";
import type { LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { resolvePlatformIdForProvider } from "@/lib/services/llm-platforms-seed";

const MODEL_TO_PROVIDER: Record<AIModelName, LlmKeyProviderName> = {
  chatgpt: "openai",
  claude:  "anthropic",
  gemini:  "gemini",
};

export type ModelSaveStats = {
  responsesSaved: number;
  analysesSaved: number;
  perfSaved: number;
  /** LLM call or chat_responses insert failed — no successful response row. */
  llmFailed: number;
  /** Response saved but chat_analysis (or perf) insert failed. */
  analysisFailed: number;
};

function logDbError(label: string, error: { message: string; code?: string; details?: string }) {
  console.error(`[visibility-persist] ${label}:`, error.message, error.code ?? "", error.details ?? "");
}

const SENTIMENT_LABELS = new Set(["positive", "neutral", "negative"]);

export function toNullableInt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value);
}

export function normalizeSentiment(
  score: number | null,
  label: string | null,
): { score: number | null; label: "positive" | "neutral" | "negative" | null } {
  if (score == null || !Number.isFinite(score)) return { score: null, label: null };
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const normalizedLabel =
    label && SENTIMENT_LABELS.has(label) ? (label as "positive" | "neutral" | "negative") : null;
  if (normalizedLabel) return { score: clamped, label: normalizedLabel };
  if (clamped >= 60) return { score: clamped, label: "positive" };
  if (clamped <= 40) return { score: clamped, label: "negative" };
  return { score: clamped, label: "neutral" };
}

export async function ensureVisibilityTables(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const checks = ["chat_responses", "chat_analysis", "brand_daily_metrics"] as const;
  for (const table of checks) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error?.message?.includes("does not exist") || error?.code === "42P01") {
      throw new Error(
        `Table "${table}" is missing. Apply supabase/migrations/20260523120000_peec_visibility_system.sql in the Supabase SQL Editor.`,
      );
    }
    if (error && !error.message.includes("0 rows")) {
      console.warn(`[visibility-persist] probe ${table}:`, error.message);
    }
  }
}

async function runAnalysis(input: AnalyzerInput): Promise<AnalyzerOutput> {
  try {
    return await analyzeResponse(input);
  } catch (err) {
    console.error(
      "[visibility-persist] analyzeResponse failed, using local detection:",
      err instanceof Error ? err.message : err,
    );
    return analyzeResponseLocal(input);
  }
}

function visibilityFromAnalysis(
  mentioned: boolean,
  position: number | null,
  sentiment: number | null,
): number {
  let score = 0;
  if (mentioned) score += 42;
  if (position != null) score += Math.max(0, 28 - (position - 1) * 6);
  if (sentiment != null) score += sentiment * 0.22;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function insertChatAnalysis(
  supabase: SupabaseClient<Database>,
  params: {
    chatResponseId: string;
    brandId: string;
    promptId: string;
    aiModel: string;
    runDate: string;
    analysis: AnalyzerOutput;
  },
): Promise<{ ok: boolean; error?: string }> {
  const sentiment = normalizeSentiment(
    params.analysis.brandSentiment,
    params.analysis.brandSentimentLabel,
  );

  const payload = {
    chat_response_id: params.chatResponseId,
    brand_id: params.brandId,
    prompt_id: params.promptId,
    ai_model: params.aiModel,
    run_date: params.runDate,
    brand_mentioned: params.analysis.brandMentioned,
    brand_position: toNullableInt(params.analysis.brandPosition),
    brand_sentiment: sentiment.score,
    brand_sentiment_label: sentiment.label,
    brand_mention_context: params.analysis.brandMentionContext,
    all_brands_mentioned: Array.isArray(params.analysis.allBrandsMentioned)
      ? params.analysis.allBrandsMentioned
      : [],
    sources_used: params.analysis.domainsReferenced.map((d) => ({ domain: d })),
  };

  const { data: inserted, error } = await supabase
    .from("chat_analysis")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    logDbError("chat_analysis insert", error);
    console.error("[visibility-persist] chat_analysis payload keys:", Object.keys(payload));
    return { ok: false, error: `${error.code ?? "error"}: ${error.message}` };
  }

  console.log(
    `[visibility-persist] chat_analysis saved id=${inserted?.id} model=${params.aiModel} mentioned=${params.analysis.brandMentioned}`,
  );
  return { ok: true };
}

async function insertLlmPerformance(
  supabase: SupabaseClient<Database>,
  params: {
    brandId: string;
    promptId: string;
    model: AIModelName;
    analysis: AnalyzerOutput;
    responseText: string;
  },
): Promise<boolean> {
  try {
    const platformId = await resolvePlatformIdForProvider(MODEL_TO_PROVIDER[params.model]);
    const visibilityScore = visibilityFromAnalysis(
      params.analysis.brandMentioned,
      params.analysis.brandPosition,
      params.analysis.brandSentiment,
    );

    const { error } = await supabase.from("llm_brand_performance").insert({
      brand_id: params.brandId,
      platform_id: platformId,
      prompt_id: params.promptId,
      is_mentioned: params.analysis.brandMentioned,
      mention_count: params.analysis.brandMentioned ? 1 : 0,
      rank_position: params.analysis.brandPosition,
      sentiment: params.analysis.brandSentimentLabel,
      sentiment_score: params.analysis.brandSentiment,
      visibility_score: visibilityScore,
      raw_response: params.responseText.slice(0, 8000),
      context: params.analysis.brandMentionContext,
      measured_at: new Date().toISOString(),
    });

    if (error) {
      logDbError("llm_brand_performance insert", error);
      return false;
    }
    console.log(`[visibility-persist] llm_brand_performance saved model=${params.model}`);
    return true;
  } catch (err) {
    console.error(
      "[visibility-persist] llm_brand_performance skipped:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

export async function persistSuccessfulModelResponse(
  supabase: SupabaseClient<Database>,
  params: {
    brandId: string;
    promptId: string;
    promptText: string;
    runDate: string;
    ownBrand: BrandForDetection;
    competitors: Array<{ name: string; domain?: string | null }>;
    model: AIModelName;
    responseText: string;
    sources: Array<{ url: string; title?: string }>;
    tokensUsed?: number;
  },
): Promise<{
  responseSaved: boolean;
  analysisSaved: boolean;
  stats: Pick<ModelSaveStats, "analysesSaved" | "perfSaved">;
}> {
  const stats = { analysesSaved: 0, perfSaved: 0 };

  const { data: savedResp, error: saveErr } = await supabase
    .from("chat_responses")
    .insert({
      brand_id: params.brandId,
      prompt_id: params.promptId,
      ai_model: params.model,
      prompt_text: params.promptText,
      response_text: params.responseText,
      raw_sources: params.sources,
      tokens_used: params.tokensUsed,
      status: "success",
      run_date: params.runDate,
    })
    .select("id")
    .single();

  if (saveErr || !savedResp) {
    logDbError("chat_responses insert", saveErr ?? { message: "no row returned" });
    return { responseSaved: false, analysisSaved: false, stats };
  }

  console.log(`[visibility-persist] chat_responses saved id=${savedResp.id} model=${params.model}`);

  const analysisInput: AnalyzerInput = {
    responseText: params.responseText,
    ownBrand: params.ownBrand,
    competitors: params.competitors,
    rawSources: params.sources,
  };

  const analysis = await runAnalysis(analysisInput);

  if (analysis.domainsReferenced.length > 0) {
    const { error: srcErr } = await supabase.from("source_appearances").insert(
      analysis.domainsReferenced.map((domain) => ({
        brand_id: params.brandId,
        chat_response_id: savedResp.id,
        prompt_id: params.promptId,
        ai_model: params.model,
        domain,
        was_used: true,
        was_cited: true,
        run_date: params.runDate,
      })),
    );
    if (srcErr) logDbError("source_appearances insert", srcErr);
  }

  const analysisResult = await insertChatAnalysis(supabase, {
    chatResponseId: savedResp.id,
    brandId: params.brandId,
    promptId: params.promptId,
    aiModel: params.model,
    runDate: params.runDate,
    analysis,
  });
  if (analysisResult.ok) {
    stats.analysesSaved = 1;
  } else if (analysisResult.error) {
    console.error(`[visibility-persist] analysis not saved for ${params.model}:`, analysisResult.error);
  }

  if (
    await insertLlmPerformance(supabase, {
      brandId: params.brandId,
      promptId: params.promptId,
      model: params.model,
      analysis,
      responseText: params.responseText,
    })
  ) {
    stats.perfSaved = 1;
  }

  return {
    responseSaved: true,
    analysisSaved: stats.analysesSaved > 0,
    stats,
  };
}

export async function syncPerformanceFromAnalysis(
  supabase: SupabaseClient<Database>,
  params: {
    brandId: string;
    promptId: string;
    model: AIModelName;
    analysis: AnalyzerOutput;
    responseText: string;
  },
): Promise<boolean> {
  return insertLlmPerformance(supabase, params);
}

export async function persistFailedModelResponse(
  supabase: SupabaseClient<Database>,
  params: {
    brandId: string;
    promptId: string;
    promptText: string;
    runDate: string;
    model: AIModelName;
    error?: string;
    sources?: Array<{ url: string; title?: string }>;
  },
): Promise<boolean> {
  const { error } = await supabase.from("chat_responses").insert({
    brand_id: params.brandId,
    prompt_id: params.promptId,
    ai_model: params.model,
    prompt_text: params.promptText,
    response_text: "",
    raw_sources: params.sources ?? [],
    error_message: params.error,
    status: "failed",
    run_date: params.runDate,
  });

  if (error) {
    logDbError("chat_responses failed-row insert", error);
    return false;
  }
  return true;
}
