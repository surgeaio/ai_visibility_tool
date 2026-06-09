import { detectBrandMentions } from "@/lib/ai/analyzer";
import { adminHasLlmProviders, getAdminLlmProviders } from "@/lib/ai/admin-providers";
import { getLlmProviderInstance, type LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { analyzeSentiment } from "@/lib/ai/sentiment";
import { isAuthBypassMode } from "@/lib/config";
import type { PromptExecutionJobData } from "@/lib/queues/types";
import { UserApiKeysRepository } from "@/lib/repositories/user-api-keys.repo";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { PromptsRepository } from "@/lib/repositories/prompts.repo";
import { BrandsRepository } from "@/lib/repositories/brands.repo";
import { CompetitorsRepository } from "@/lib/repositories/competitors.repo";
import { ensureLlmPlatformsSeeded, resolvePlatformIdForProvider } from "@/lib/services/llm-platforms-seed";

export type LLMPlatformKey = LlmKeyProviderName;

export interface LLMTrackingResult {
  platform: LLMPlatformKey;
  isMentioned: boolean;
  mentionCount: number;
  rankPosition: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentimentScore: number | null;
  visibilityScore: number;
  rawResponse: string;
  context: string | null;
  costUsd: number;
}

function defaultModelFor(provider: LLMPlatformKey): string {
  const p = getLlmProviderInstance(provider);
  if (provider === "openai") return "gpt-4o-mini";
  return p.defaultModel;
}

function calculateVisibilityScore(params: {
  isMentioned: boolean;
  mentionCount: number;
  rankPosition: number | null;
  sentimentScore: number | null;
  competitorHits: number;
}): number {
  let score = 0;
  if (params.isMentioned) score += 42;
  if (params.rankPosition != null) {
    score += Math.max(0, 28 - (params.rankPosition - 1) * 6);
  }
  if (params.sentimentScore != null) {
    score += params.sentimentScore * 0.22;
  }
  score += Math.min(8, params.mentionCount * 2);
  score -= Math.min(18, params.competitorHits * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function persistPerformanceRow(params: {
  brandId: string;
  promptId: string;
  platform: LLMPlatformKey;
  result: LLMTrackingResult;
}): Promise<void> {
  console.log(
    `[persist] start provider=${params.platform} brand=${params.brandId} prompt=${params.promptId}`,
  );

  const platformId = await resolvePlatformIdForProvider(params.platform);
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing — cannot write llm_brand_performance");
  }

  const { data, error } = await admin
    .from("llm_brand_performance")
    .insert({
      brand_id: params.brandId,
      platform_id: platformId,
      prompt_id: params.promptId,
      is_mentioned: params.result.isMentioned,
      mention_count: params.result.mentionCount,
      rank_position: params.result.rankPosition,
      sentiment: params.result.sentiment,
      sentiment_score: params.result.sentimentScore,
      visibility_score: params.result.visibilityScore,
      raw_response: params.result.rawResponse,
      context: params.result.context,
      measured_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[persist] INSERT failed:", error.message, error);
    throw new Error(`Failed to persist llm_brand_performance: ${error.message}`);
  }

  console.log(`[persist] OK row id=${(data as { id: string }).id}`);
}

async function persistFailedRow(params: {
  brandId: string;
  promptId: string;
  platform: LLMPlatformKey;
  error: string;
}): Promise<void> {
  console.log(`[persist] failed row provider=${params.platform} error=${params.error.slice(0, 80)}`);

  const platformId = await resolvePlatformIdForProvider(params.platform);
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing — cannot write failed llm_brand_performance row");
  }

  const { error } = await admin.from("llm_brand_performance").insert({
    brand_id: params.brandId,
    platform_id: platformId,
    prompt_id: params.promptId,
    is_mentioned: false,
    mention_count: 0,
    rank_position: null,
    sentiment: null,
    sentiment_score: null,
    visibility_score: 0,
    raw_response: params.error.slice(0, 4000),
    context: "execution_failed",
    measured_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[persist] failed-row INSERT error:", error.message);
    throw new Error(`Failed to persist failed row: ${error.message}`);
  }
}

export async function runPromptOnPlatform(params: {
  platform: LLMPlatformKey;
  prompt: string;
  brandName: string;
  competitors: string[];
  apiKey: string;
  openAiKeyForSentiment?: string;
  requestId: string;
}): Promise<LLMTrackingResult> {
  const provider = getLlmProviderInstance(params.platform);
  const model = defaultModelFor(params.platform);
  const response = await provider.execute(params.prompt, {
    requestId: params.requestId,
    apiKey: params.apiKey,
    model,
    temperature: 0.5,
    maxTokens: 1500,
  });

  const brandsToScan = [params.brandName, ...params.competitors];
  const { mentioned, positions, snippets } = detectBrandMentions(response.rawResponse, brandsToScan);
  const competitorHits = params.competitors.filter((c) =>
    response.rawResponse.toLowerCase().includes(c.toLowerCase()),
  ).length;

  const rankPosition = mentioned ? positions[params.brandName] ?? null : null;
  const mentionCount = mentioned
    ? (response.rawResponse.match(new RegExp(params.brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? [])
        .length || 1
    : 0;

  let sentiment: LLMTrackingResult["sentiment"] = null;
  let sentimentScore: number | null = null;
  if (mentioned) {
    const s = await analyzeSentiment(response.rawResponse, params.brandName, {
      openAiApiKey: params.openAiKeyForSentiment,
    });
    sentiment = s.sentiment;
    sentimentScore = s.score;
  }

  const visibilityScore = calculateVisibilityScore({
    isMentioned: mentioned,
    mentionCount,
    rankPosition,
    sentimentScore,
    competitorHits,
  });

  return {
    platform: params.platform,
    isMentioned: mentioned,
    mentionCount,
    rankPosition,
    sentiment,
    sentimentScore,
    visibilityScore,
    rawResponse: response.rawResponse,
    context: snippets[params.brandName] ?? null,
    costUsd: response.cost,
  };
}

export async function executePromptExecutionJob(
  job: PromptExecutionJobData,
): Promise<{ results: LLMTrackingResult[]; errors: string[] }> {
  console.log("[llm-tracker] START", JSON.stringify(job));

  await ensureLlmPlatformsSeeded();

  const keysRepo = new UserApiKeysRepository();
  const promptsRepo = new PromptsRepository();
  const brandsRepo = new BrandsRepository();
  const competitorsRepo = new CompetitorsRepository();

  const prompt = await promptsRepo.findById(job.promptId);
  if (!prompt) {
    console.error("[llm-tracker] prompt_not_found", job.promptId);
    return { results: [], errors: ["prompt_not_found"] };
  }

  const brandId = job.brandId ?? prompt.brandId;
  const brand = await brandsRepo.findById(brandId);
  if (!brand) {
    console.error("[llm-tracker] brand_not_found", brandId);
    return { results: [], errors: ["brand_not_found"] };
  }

  console.log("[llm-tracker] brand", { brandId, brandName: brand.name, promptBrandId: prompt.brandId });

  const { items: compItems } = await competitorsRepo.findMany({
    pagination: { limit: 50, offset: 0 },
    filters: isAuthBypassMode() ? undefined : { brandId },
  });
  const competitorNames = compItems.map((c) => c.name);

  let providers = getAdminLlmProviders();
  if (!providers.length) {
    const userKeys = await keysRepo.listActiveLlmKeysDecrypted(job.userId);
    providers = userKeys.map((k) => ({ provider: k.provider, apiKey: k.apiKey }));
  }

  console.log(
    "[llm-tracker] providers:",
    providers.map((p) => p.provider).join(",") || "(none)",
  );

  if (!providers.length) {
    console.error("[llm-tracker] No admin or user provider keys configured");
    return { results: [], errors: ["no_admin_keys"] };
  }

  const openAiKeyForSentiment =
    providers.find((p) => p.provider === "openai")?.apiKey ?? process.env.OPENAI_API_KEY?.trim();

  const results: LLMTrackingResult[] = [];
  const errors: string[] = [];

  for (const p of providers) {
    const requestId = job.requestId ?? `job-${job.promptId}-${p.provider}`;
    try {
      console.log(`[llm-tracker] calling ${p.provider} for prompt ${job.promptId}`);
      const result = await runPromptOnPlatform({
        platform: p.provider,
        prompt: prompt.text,
        brandName: brand.name,
        competitors: competitorNames,
        apiKey: p.apiKey,
        openAiKeyForSentiment,
        requestId,
      });
      results.push(result);
      await persistPerformanceRow({
        brandId,
        promptId: job.promptId,
        platform: p.provider,
        result,
      });
      console.log(`[llm-tracker] persisted OK for ${p.provider}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[llm-run] ${p.provider} failed:`, msg);
      errors.push(`${p.provider}: ${msg}`);
      try {
        await persistFailedRow({ brandId, promptId: job.promptId, platform: p.provider, error: msg });
      } catch (persistErr) {
        console.error(`[llm-tracker] could not persist failed row:`, persistErr);
      }
    }
  }

  console.log("[llm-tracker] DONE", { ok: results.length, errors: errors.length });
  return { results, errors };
}

export { adminHasLlmProviders };

/** @deprecated Prefer `executePromptExecutionJob` from workers. */
export class LLMTracker {
  async runPromptOnPlatform(
    platform: LLMPlatformKey,
    prompt: string,
    brandName: string,
    competitors: string[],
  ): Promise<LLMTrackingResult> {
    return runPromptOnPlatform({
      platform,
      prompt,
      brandName,
      competitors,
      apiKey: "",
      requestId: "legacy",
    });
  }

  async runAcrossAllPlatforms(_promptId: string): Promise<void> {
    void _promptId;
  }

  async getBrandVisibility(
    _brandId: string,
    _range: "7d" | "30d" | "90d",
  ): Promise<{ platform: string; score: number }[]> {
    void _brandId;
    void _range;
    return [
      { platform: "ChatGPT", score: 85 },
      { platform: "Claude", score: 68 },
      { platform: "Gemini", score: 71 },
    ];
  }
}
