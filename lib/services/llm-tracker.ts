import { detectBrandMentions } from "@/lib/ai/analyzer";
import { adminHasLlmProviders, getAdminLlmProviders } from "@/lib/ai/admin-providers";
import { getLlmProviderInstance, LLM_KEY_TO_PLATFORM_SLUG, type LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { analyzeSentiment } from "@/lib/ai/sentiment";
import { isAuthBypassMode } from "@/lib/config";
import type { PromptExecutionJobData } from "@/lib/queues/types";
import { UserApiKeysRepository } from "@/lib/repositories/user-api-keys.repo";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { PromptsRepository } from "@/lib/repositories/prompts.repo";
import { BrandsRepository } from "@/lib/repositories/brands.repo";
import { CompetitorsRepository } from "@/lib/repositories/competitors.repo";

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

async function resolvePlatformId(
  admin: NonNullable<ReturnType<typeof tryCreateAdminSupabaseClient>>,
  provider: LLMPlatformKey,
): Promise<string | null> {
  const slug = LLM_KEY_TO_PLATFORM_SLUG[provider];
  const { data, error } = await admin.from("llm_platforms").select("id").eq("name", slug).maybeSingle();
  if (error) {
    console.error("[llm-tracker] platform lookup", error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

async function persistPerformanceRow(params: {
  brandId: string;
  promptId: string;
  platform: LLMPlatformKey;
  result: LLMTrackingResult;
}): Promise<void> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    console.warn("[llm-tracker] skip persist: no service role client");
    return;
  }
  const platformId = await resolvePlatformId(admin, params.platform);
  if (!platformId) return;

  const { error } = await admin.from("llm_brand_performance").insert({
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
  });
  if (error) {
    console.error("[llm-tracker] insert llm_brand_performance", error.message);
  }
}

async function persistFailedRow(params: {
  brandId: string;
  promptId: string;
  platform: LLMPlatformKey;
  error: string;
}): Promise<void> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    console.warn("[llm-tracker] skip failed row: no service role client");
    return;
  }
  const platformId = await resolvePlatformId(admin, params.platform);
  if (!platformId) return;

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
    console.error("[llm-tracker] insert failed llm_brand_performance", error.message);
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
  const keysRepo = new UserApiKeysRepository();
  const promptsRepo = new PromptsRepository();
  const brandsRepo = new BrandsRepository();
  const competitorsRepo = new CompetitorsRepository();

  const prompt = await promptsRepo.findById(job.promptId);
  if (!prompt) {
    return { results: [], errors: ["prompt_not_found"] };
  }

  const brandId = job.brandId ?? prompt.brandId;
  const brand = await brandsRepo.findById(brandId);
  if (!brand) {
    return { results: [], errors: ["brand_not_found"] };
  }

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

  if (!providers.length) {
    console.error("[llm-tracker] No admin or user provider keys configured");
    return { results: [], errors: ["no_admin_keys"] };
  }

  const openAiKeyForSentiment =
    providers.find((p) => p.provider === "openai")?.apiKey ?? process.env.OPENAI_API_KEY?.trim();

  const settled = await Promise.allSettled(
    providers.map((p) =>
      runPromptOnPlatform({
        platform: p.provider,
        prompt: prompt.text,
        brandName: brand.name,
        competitors: competitorNames,
        apiKey: p.apiKey,
        openAiKeyForSentiment,
        requestId: job.requestId ?? `job-${job.promptId}-${p.provider}`,
      }),
    ),
  );

  const results: LLMTrackingResult[] = [];
  const errors: string[] = [];
  settled.forEach((r, i) => {
    const provider = providers[i].provider;
    if (r.status === "fulfilled") {
      results.push(r.value);
      void persistPerformanceRow({
        brandId,
        promptId: job.promptId,
        platform: provider,
        result: r.value,
      });
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error(`[llm-run] ${provider} failed:`, msg);
      errors.push(`${provider}: ${msg}`);
      void persistFailedRow({ brandId, promptId: job.promptId, platform: provider, error: msg });
    }
  });

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
      { platform: "Perplexity", score: 64 },
    ];
  }
}
