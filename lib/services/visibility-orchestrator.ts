import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { BrandForDetection } from "@/lib/services/brand-mention-detector";
import {
  ensureLlmPlatformsSeeded,
  resolvePlatformIdForProvider,
  resolvePlatformIdBySlug,
} from "@/lib/services/llm-platforms-seed";
import type { LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { DEFAULT_VISIBILITY_MODELS } from "@/lib/ai/models";
import { runPromptOnAllModels, type AIModelName } from "@/lib/services/ai-executor";
import { analyzeResponse, analyzeResponseLocal } from "@/lib/services/response-analyzer";
import {
  ensureVisibilityTables,
  normalizeSentiment,
  persistFailedModelResponse,
  persistSuccessfulModelResponse,
  syncPerformanceFromAnalysis,
  toNullableInt,
  type ModelSaveStats,
} from "@/lib/services/visibility-persist";

const MODEL_TO_PROVIDER: Partial<Record<AIModelName, LlmKeyProviderName>> = {
  chatgpt:    "openai",
  claude:     "anthropic",
  gemini:     "gemini",
  perplexity: "perplexity",
  // llama, deepseek, mistral route through OpenRouter — resolved by slug
};

function requireAdmin() {
  return createAdminSupabaseClient();
}

type OrchestratorBrand = BrandForDetection & { id: string };

async function loadBrandForOrchestrator(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  brandId: string,
): Promise<OrchestratorBrand> {
  console.log(`[visibility-orchestrator] Looking up brand: ${brandId}`);

  const { data: brand, error } = await supabase
    .from("brands")
    .select("id, name, domain, website")
    .eq("id", brandId)
    .maybeSingle();

  if (error) {
    console.error("[visibility-orchestrator] Brand query error:", error.message, error.details);
    throw new Error(`Brand query failed: ${error.message}`);
  }

  if (!brand) {
    const { data: sample } = await supabase.from("brands").select("id, name").limit(5);
    console.error(
      "[visibility-orchestrator] Brand not found for ID:",
      brandId,
      "sample:",
      sample?.map((b) => `${b.id}: ${b.name}`),
    );
    throw new Error(`Brand not found: ${brandId}`);
  }

  console.log(`[visibility-orchestrator] Found brand: ${brand.name}`);
  return {
    id: brand.id,
    name: brand.name,
    domain: brand.domain ?? brand.website,
    website: brand.website,
    aliases: [],
  };
}

export interface RunPromptOptions {
  brandId: string;
  promptId: string;
  models?: AIModelName[];
  triggeredBy?: "manual" | "scheduled" | "on_demand";
  /** Authenticated user id — used to load per-user LLM API keys when env keys are missing. */
  userId?: string;
}

export async function refreshDailyMetrics(brandId: string, date: string) {
  const supabase = requireAdmin();

  const { data: analyses } = await supabase
    .from("chat_analysis")
    .select("ai_model, brand_mentioned, brand_position, brand_sentiment, brand_sentiment_label")
    .eq("brand_id", brandId)
    .eq("run_date", date);

  if (!analyses?.length) return;

  const models = ["all", ...DEFAULT_VISIBILITY_MODELS, "chatgpt", "claude", "gemini", "perplexity"] as const;

  for (const model of models) {
    const rows =
      model === "all" ? analyses : analyses.filter((a) => a.ai_model === model);
    if (!rows.length) continue;

    const total = rows.length;
    const mentions = rows.filter((r) => r.brand_mentioned).length;
    const visibility = (mentions / total) * 100;

    const positions = rows
      .map((r) => r.brand_position)
      .filter((p): p is number => p != null);
    const avgPos = positions.length
      ? positions.reduce((a, b) => a + b, 0) / positions.length
      : null;

    const sentiments = rows
      .map((r) => r.brand_sentiment)
      .filter((s): s is number => s != null);
    const avgSent = sentiments.length
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : null;

    const pos = rows.filter((r) => r.brand_sentiment_label === "positive").length;
    const neu = rows.filter((r) => r.brand_sentiment_label === "neutral").length;
    const neg = rows.filter((r) => r.brand_sentiment_label === "negative").length;

    const { error: metricsErr } = await supabase.from("brand_daily_metrics").upsert(
      {
        brand_id: brandId,
        ai_model: model,
        metric_date: date,
        total_chats: total,
        brand_mentions: mentions,
        visibility_pct: Math.round(visibility * 100) / 100,
        avg_position: avgPos != null ? Math.round(avgPos * 100) / 100 : null,
        avg_sentiment: avgSent != null ? Math.round(avgSent * 100) / 100 : null,
        positive_mentions: pos,
        neutral_mentions: neu,
        negative_mentions: neg,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "brand_id,ai_model,metric_date" },
    );

    if (metricsErr) {
      console.error(
        `[visibility-orchestrator] brand_daily_metrics upsert failed (${model}):`,
        metricsErr.message,
      );
    } else if (model === "all") {
      console.log(
        `[visibility-orchestrator] brand_daily_metrics updated: ${Math.round(visibility * 100) / 100}% visibility (${mentions}/${total})`,
      );
    }
  }
}

export async function runSinglePrompt(opts: RunPromptOptions) {
  const supabase = requireAdmin();
  await ensureLlmPlatformsSeeded();

  const { data: prompt, error: pErr } = await supabase
    .from("prompts")
    .select("id, text, brand_id")
    .eq("id", opts.promptId)
    .eq("brand_id", opts.brandId)
    .single();
  if (pErr || !prompt) throw new Error("Prompt not found");

  const ownBrand = await loadBrandForOrchestrator(supabase, opts.brandId);

  const { data: competitors, error: compErr } = await supabase
    .from("competitors")
    .select("competitor_name, domain")
    .eq("brand_id", opts.brandId);

  if (compErr) {
    console.error("[visibility-orchestrator] competitors query error:", compErr.message);
  }

  const competitorList = (competitors ?? []).map((c) => ({
    name: c.competitor_name as string,
    domain: c.domain as string | null,
  }));

  const models = opts.models ?? ([...DEFAULT_VISIBILITY_MODELS] as AIModelName[]);
  const responses = await runPromptOnAllModels(prompt.text as string, models, opts.userId);
  const runDate = new Date().toISOString().slice(0, 10);
  const results: Array<Record<string, unknown>> = [];
  const saveStats: ModelSaveStats = {
    responsesSaved: 0,
    analysesSaved: 0,
    perfSaved: 0,
    llmFailed: 0,
    analysisFailed: 0,
  };

  for (const resp of responses) {
    if (resp.status === "failed" || !resp.responseText?.trim()) {
      saveStats.llmFailed += 1;
      await persistFailedModelResponse(supabase, {
        brandId: opts.brandId,
        promptId: opts.promptId,
        promptText: prompt.text as string,
        runDate,
        model: resp.model,
        error: resp.error,
        sources: resp.sources,
      });
      results.push({ model: resp.model, status: "failed", error: resp.error });
      continue;
    }

    const persisted = await persistSuccessfulModelResponse(supabase, {
      brandId: opts.brandId,
      promptId: opts.promptId,
      promptText: prompt.text as string,
      runDate,
      ownBrand,
      competitors: competitorList,
      model: resp.model,
      responseText: resp.responseText,
      sources: resp.sources,
      tokensUsed: resp.tokensUsed,
    });

    if (persisted.responseSaved) {
      saveStats.responsesSaved += 1;
      saveStats.analysesSaved += persisted.stats.analysesSaved;
      saveStats.perfSaved += persisted.stats.perfSaved;
    }
    if (!persisted.analysisSaved) {
      saveStats.analysisFailed += 1;
      if (persisted.responseSaved) {
        console.error(
          `[visibility-orchestrator] chat_analysis not saved model=${resp.model} prompt=${opts.promptId}`,
        );
      }
    }

    results.push({
      model: resp.model,
      status: persisted.analysisSaved ? "success" : "save_partial",
      saved: persisted.analysisSaved,
    });
  }

  await refreshDailyMetrics(opts.brandId, runDate);
  const modelErrors = responses
    .filter((r) => r.status === "failed" && r.error)
    .map((r) => ({ model: r.model, error: r.error as string }));

  console.log(
    `[visibility-orchestrator] Finished prompt ${opts.promptId} saves=${JSON.stringify(saveStats)}`,
  );
  return { promptId: opts.promptId, results, saveStats, modelErrors };
}

export async function runAllPromptsForBrand(
  brandId: string,
  triggeredBy: "manual" | "scheduled" | "on_demand" = "manual",
  triggeredByUserId?: string,
  models?: AIModelName[],
) {
  const supabase = requireAdmin();
  await ensureVisibilityTables(supabase);

  const { data: prompts } = await supabase
    .from("prompts")
    .select("id")
    .eq("brand_id", brandId)
    .eq("is_active", true);

  if (!prompts?.length) {
    return { jobId: null, completed: 0, failed: 0, message: "No active prompts to run" };
  }

  const { data: job } = await supabase
    .from("prompt_run_jobs")
    .insert({
      brand_id: brandId,
      job_type: triggeredBy,
      status: "running",
      total_prompts: prompts.length,
      triggered_by: triggeredByUserId ?? null,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  let completed = 0;
  let failed = 0;
  const totals: ModelSaveStats = {
    responsesSaved: 0,
    analysesSaved: 0,
    perfSaved: 0,
    llmFailed: 0,
    analysisFailed: 0,
  };
  const modelErrorMap = new Map<string, string>();

  for (const p of prompts) {
    try {
      const run = await runSinglePrompt({
        brandId,
        promptId: p.id as string,
        triggeredBy,
        userId: triggeredByUserId,
        models,
      });
      if (run.saveStats) {
        totals.responsesSaved += run.saveStats.responsesSaved;
        totals.analysesSaved += run.saveStats.analysesSaved;
        totals.perfSaved += run.saveStats.perfSaved;
        totals.llmFailed += run.saveStats.llmFailed;
        totals.analysisFailed += run.saveStats.analysisFailed;
      }
      for (const me of run.modelErrors ?? []) {
        modelErrorMap.set(me.model, me.error);
      }
      completed += 1;
    } catch (err) {
      console.error("[visibility-orchestrator] prompt failed", p.id, err);
      failed += 1;
    }
    if (job?.id) {
      await supabase
        .from("prompt_run_jobs")
        .update({ completed_prompts: completed, failed_prompts: failed })
        .eq("id", job.id);
    }
  }

  if (job?.id) {
    await supabase
      .from("prompt_run_jobs")
      .update({
        status: failed === 0 ? "completed" : completed > 0 ? "partial" : "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }

  const today = new Date().toISOString().slice(0, 10);

  if (totals.analysesSaved === 0 && totals.responsesSaved > 0) {
    console.log(
      `[visibility-orchestrator] No chat_analysis rows — auto re-analyze from ${totals.responsesSaved} chat_responses`,
    );
    try {
      const re = await reanalyzeBrandResponses(brandId);
      totals.analysesSaved = re.updated;
      console.log(`[visibility-orchestrator] Auto re-analyze updated ${re.updated} rows`);
    } catch (reErr) {
      console.error("[visibility-orchestrator] Auto re-analyze failed:", reErr);
    }
  }

  await refreshDailyMetrics(brandId, today);
  console.log(
    `[visibility-orchestrator] Run complete brand=${brandId} completed=${completed} failed=${failed} saves=${JSON.stringify(totals)}`,
  );

  const modelErrors = [...modelErrorMap.entries()].map(([model, error]) => ({ model, error }));

  return { jobId: job?.id ?? null, completed, failed, saveStats: totals, modelErrors };
}

/** Re-run brand detection on saved chat_responses without calling LLMs again. */
export async function reanalyzeBrandResponses(brandId: string) {
  const supabase = requireAdmin();
  await ensureLlmPlatformsSeeded();

  const ownBrand = await loadBrandForOrchestrator(supabase, brandId);

  const { data: competitors } = await supabase
    .from("competitors")
    .select("competitor_name, domain")
    .eq("brand_id", brandId);

  const competitorList = (competitors ?? []).map((c) => ({
    name: c.competitor_name as string,
    domain: c.domain as string | null,
  }));

  const { data: responses, error: respErr } = await supabase
    .from("chat_responses")
    .select("id, prompt_id, ai_model, response_text, raw_sources, run_date, status")
    .eq("brand_id", brandId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(200);

  if (respErr) throw new Error(respErr.message);
  if (!responses?.length) {
    return { updated: 0, message: "No saved responses to re-analyze" };
  }

  let updated = 0;
  const datesToRefresh = new Set<string>();

  for (const row of responses) {
    const text = row.response_text as string;
    if (!text?.trim()) continue;

    const runDate = (row.run_date as string) ?? new Date().toISOString().slice(0, 10);
    datesToRefresh.add(runDate);

    let analysis;
    try {
      analysis = await analyzeResponse({
        responseText: text,
        ownBrand,
        competitors: competitorList,
        rawSources: (row.raw_sources as Array<{ url: string }>) ?? [],
      });
    } catch {
      analysis = analyzeResponseLocal({
        responseText: text,
        ownBrand,
        competitors: competitorList,
        rawSources: (row.raw_sources as Array<{ url: string }>) ?? [],
      });
    }

    await supabase.from("chat_analysis").delete().eq("chat_response_id", row.id);

    const sentiment = normalizeSentiment(
      analysis.brandSentiment,
      analysis.brandSentimentLabel,
    );

    const { error: insertErr } = await supabase.from("chat_analysis").insert({
      chat_response_id: row.id,
      brand_id: brandId,
      prompt_id: row.prompt_id as string,
      ai_model: row.ai_model as string,
      run_date: runDate,
      brand_mentioned: analysis.brandMentioned,
      brand_position: toNullableInt(analysis.brandPosition),
      brand_sentiment: sentiment.score,
      brand_sentiment_label: sentiment.label,
      brand_mention_context: analysis.brandMentionContext,
      all_brands_mentioned: analysis.allBrandsMentioned,
      sources_used: analysis.domainsReferenced.map((d) => ({ domain: d })),
    });

    if (insertErr) {
      console.error("[visibility-orchestrator] reanalyze insert failed:", insertErr.message);
      continue;
    }

    const modelName = row.ai_model as AIModelName;
    const provider = MODEL_TO_PROVIDER[modelName];
    if (provider) {
      try {
        const platformId = await resolvePlatformIdForProvider(provider);
        await supabase
          .from("llm_brand_performance")
          .delete()
          .eq("brand_id", brandId)
          .eq("prompt_id", row.prompt_id as string)
          .eq("platform_id", platformId);
      } catch {
        // ignore platform lookup failures during re-analyze
      }
    } else {
      // OpenRouter-only model (llama/deepseek/mistral) — look up by slug
      const platformId = await resolvePlatformIdBySlug(modelName);
      if (platformId) {
        await supabase
          .from("llm_brand_performance")
          .delete()
          .eq("brand_id", brandId)
          .eq("prompt_id", row.prompt_id as string)
          .eq("platform_id", platformId);
      }
    }

    await syncPerformanceFromAnalysis(supabase, {
      brandId,
      promptId: row.prompt_id as string,
      model: modelName,
      analysis,
      responseText: text,
    });

    updated += 1;
  }

  for (const date of datesToRefresh) {
    await refreshDailyMetrics(brandId, date);
  }

  return { updated, datesRefreshed: [...datesToRefresh] };
}
