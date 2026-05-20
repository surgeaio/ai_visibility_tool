import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { BrandForDetection } from "@/lib/services/brand-mention-detector";
import {
  ensureLlmPlatformsSeeded,
  resolvePlatformIdForProvider,
} from "@/lib/services/llm-platforms-seed";
import type { LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { runPromptOnAllModels, type AIModelName } from "@/lib/services/ai-executor";
import { analyzeResponse } from "@/lib/services/response-analyzer";

const MODEL_TO_PROVIDER: Record<AIModelName, LlmKeyProviderName> = {
  chatgpt: "openai",
  claude: "anthropic",
  gemini: "gemini",
  perplexity: "perplexity",
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
}

async function syncLlmBrandPerformance(params: {
  brandId: string;
  promptId: string;
  model: AIModelName;
  result: {
    isMentioned: boolean;
    rankPosition: number | null;
    sentiment: string | null;
    sentimentScore: number | null;
    visibilityScore: number;
    rawResponse: string;
    context: string | null;
  };
}) {
  const admin = requireAdmin();
  const platformId = await resolvePlatformIdForProvider(MODEL_TO_PROVIDER[params.model]);
  const { error } = await admin.from("llm_brand_performance").insert({
    brand_id: params.brandId,
    platform_id: platformId,
    prompt_id: params.promptId,
    is_mentioned: params.result.isMentioned,
    mention_count: params.result.isMentioned ? 1 : 0,
    rank_position: params.result.rankPosition,
    sentiment: params.result.sentiment,
    sentiment_score: params.result.sentimentScore,
    visibility_score: params.result.visibilityScore,
    raw_response: params.result.rawResponse.slice(0, 8000),
    context: params.result.context,
    measured_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[visibility-orchestrator] llm_brand_performance insert failed:", error.message);
    throw new Error(error.message);
  }
}

function visibilityFromAnalysis(mentioned: boolean, position: number | null, sentiment: number | null): number {
  let score = 0;
  if (mentioned) score += 42;
  if (position != null) score += Math.max(0, 28 - (position - 1) * 6);
  if (sentiment != null) score += sentiment * 0.22;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function refreshDailyMetrics(brandId: string, date: string) {
  const supabase = requireAdmin();

  const { data: analyses } = await supabase
    .from("chat_analysis")
    .select("ai_model, brand_mentioned, brand_position, brand_sentiment, brand_sentiment_label")
    .eq("brand_id", brandId)
    .eq("run_date", date);

  if (!analyses?.length) return;

  const models = ["all", "chatgpt", "claude", "gemini", "perplexity"] as const;

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

    await supabase.from("brand_daily_metrics").upsert(
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

  const models = opts.models ?? ["chatgpt", "claude", "gemini", "perplexity"];
  const responses = await runPromptOnAllModels(prompt.text as string, models);
  const runDate = new Date().toISOString().slice(0, 10);
  const results: Array<Record<string, unknown>> = [];

  for (const resp of responses) {
    if (resp.status === "failed" || !resp.responseText) {
      await supabase.from("chat_responses").insert({
        brand_id: opts.brandId,
        prompt_id: opts.promptId,
        ai_model: resp.model,
        prompt_text: prompt.text,
        response_text: "",
        raw_sources: resp.sources,
        error_message: resp.error,
        status: "failed",
        run_date: runDate,
      });
      results.push({ model: resp.model, status: "failed", error: resp.error });
      continue;
    }

    const { data: savedResp, error: saveErr } = await supabase
      .from("chat_responses")
      .insert({
        brand_id: opts.brandId,
        prompt_id: opts.promptId,
        ai_model: resp.model,
        prompt_text: prompt.text,
        response_text: resp.responseText,
        raw_sources: resp.sources,
        tokens_used: resp.tokensUsed,
        status: "success",
        run_date: runDate,
      })
      .select("id")
      .single();

    if (saveErr || !savedResp) {
      results.push({ model: resp.model, status: "save_failed" });
      continue;
    }

    try {
      const analysis = await analyzeResponse({
        responseText: resp.responseText,
        ownBrand,
        competitors: competitorList,
        rawSources: resp.sources,
      });

      console.log(
        `[visibility-orchestrator] model=${resp.model} brand=${ownBrand.name} mentioned=${analysis.brandMentioned} position=${analysis.brandPosition} source=${analysis.detectionSource}`,
      );
      console.log(
        `[visibility-orchestrator] response preview: ${resp.responseText.slice(0, 200).replace(/\n/g, " ")}`,
      );

      const { error: analysisErr } = await supabase.from("chat_analysis").insert({
        chat_response_id: savedResp.id,
        brand_id: opts.brandId,
        prompt_id: opts.promptId,
        ai_model: resp.model,
        run_date: runDate,
        brand_mentioned: analysis.brandMentioned,
        brand_position: analysis.brandPosition,
        brand_sentiment: analysis.brandSentiment,
        brand_sentiment_label: analysis.brandSentimentLabel,
        brand_mention_context: analysis.brandMentionContext,
        all_brands_mentioned: analysis.allBrandsMentioned,
        sources_used: analysis.domainsReferenced.map((d) => ({ domain: d })),
      });

      if (analysisErr) {
        console.error("[visibility-orchestrator] chat_analysis insert failed:", analysisErr);
        throw new Error(analysisErr.message);
      }

      if (analysis.domainsReferenced.length > 0) {
        await supabase.from("source_appearances").insert(
          analysis.domainsReferenced.map((domain) => ({
            brand_id: opts.brandId,
            chat_response_id: savedResp.id,
            prompt_id: opts.promptId,
            ai_model: resp.model,
            domain,
            was_used: true,
            was_cited: true,
            run_date: runDate,
          })),
        );
      }

      const visibilityScore = visibilityFromAnalysis(
        analysis.brandMentioned,
        analysis.brandPosition,
        analysis.brandSentiment,
      );

      await syncLlmBrandPerformance({
        brandId: opts.brandId,
        promptId: opts.promptId,
        model: resp.model,
        result: {
          isMentioned: analysis.brandMentioned,
          rankPosition: analysis.brandPosition,
          sentiment: analysis.brandSentimentLabel,
          sentimentScore: analysis.brandSentiment,
          visibilityScore,
          rawResponse: resp.responseText,
          context: analysis.brandMentionContext,
        },
      });

      results.push({
        model: resp.model,
        status: "success",
        brandMentioned: analysis.brandMentioned,
        position: analysis.brandPosition,
        sentiment: analysis.brandSentiment,
      });
    } catch (analyzeErr) {
      const msg = analyzeErr instanceof Error ? analyzeErr.message : "analyze_failed";
      results.push({ model: resp.model, status: "analyze_failed", error: msg });
    }
  }

  await refreshDailyMetrics(opts.brandId, runDate);
  return { promptId: opts.promptId, results };
}

export async function runAllPromptsForBrand(
  brandId: string,
  triggeredBy: "manual" | "scheduled" | "on_demand" = "manual",
  triggeredByUserId?: string,
) {
  const supabase = requireAdmin();

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

  for (const p of prompts) {
    try {
      await runSinglePrompt({ brandId, promptId: p.id as string, triggeredBy });
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

  return { jobId: job?.id ?? null, completed, failed };
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

    const analysis = await analyzeResponse({
      responseText: text,
      ownBrand,
      competitors: competitorList,
      rawSources: (row.raw_sources as Array<{ url: string }>) ?? [],
    });

    await supabase.from("chat_analysis").delete().eq("chat_response_id", row.id);

    const { error: insertErr } = await supabase.from("chat_analysis").insert({
      chat_response_id: row.id,
      brand_id: brandId,
      prompt_id: row.prompt_id as string,
      ai_model: row.ai_model as string,
      run_date: runDate,
      brand_mentioned: analysis.brandMentioned,
      brand_position: analysis.brandPosition,
      brand_sentiment: analysis.brandSentiment,
      brand_sentiment_label: analysis.brandSentimentLabel,
      brand_mention_context: analysis.brandMentionContext,
      all_brands_mentioned: analysis.allBrandsMentioned,
      sources_used: analysis.domainsReferenced.map((d) => ({ domain: d })),
    });

    if (insertErr) {
      console.error("[visibility-orchestrator] reanalyze insert failed:", insertErr);
      continue;
    }

    const visibilityScore = visibilityFromAnalysis(
      analysis.brandMentioned,
      analysis.brandPosition,
      analysis.brandSentiment,
    );

    const modelName = row.ai_model as AIModelName;
    if (modelName in MODEL_TO_PROVIDER) {
      const platformId = await resolvePlatformIdForProvider(MODEL_TO_PROVIDER[modelName]);
      await supabase
        .from("llm_brand_performance")
        .delete()
        .eq("brand_id", brandId)
        .eq("prompt_id", row.prompt_id as string)
        .eq("platform_id", platformId);
    }

    try {
      await syncLlmBrandPerformance({
        brandId,
        promptId: row.prompt_id as string,
        model: modelName,
        result: {
          isMentioned: analysis.brandMentioned,
          rankPosition: analysis.brandPosition,
          sentiment: analysis.brandSentimentLabel,
          sentimentScore: analysis.brandSentiment,
          visibilityScore,
          rawResponse: text,
          context: analysis.brandMentionContext,
        },
      });
    } catch (perfErr) {
      console.error("[visibility-orchestrator] reanalyze perf sync failed:", perfErr);
    }

    updated += 1;
  }

  for (const date of datesToRefresh) {
    await refreshDailyMetrics(brandId, date);
  }

  return { updated, datesRefreshed: [...datesToRefresh] };
}
