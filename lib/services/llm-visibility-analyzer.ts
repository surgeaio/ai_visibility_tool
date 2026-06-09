import { randomUUID } from "crypto";
import type { LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { getLlmProviderInstance } from "@/lib/ai/llm-provider-factory";
import type { BrandQueryDefinition } from "@/lib/brand-audit/query-sets";
import type { LlmQueryCategory, LlmSentiment, LlmVisibilityQueryResult } from "@/lib/brand-audit/types";
import { calculateQueryVisibilityScore } from "@/lib/utils/score-calculator";
import { hasAnthropic, hasOpenAI } from "@/lib/config";

const hasOpenRouterEnv = () => Boolean(process.env.OPENROUTER_API_KEY?.trim());

const PROVIDER_ENV: Record<LlmKeyProviderName, () => boolean> = {
  openai: hasOpenAI,
  anthropic: hasAnthropic,
  gemini: () => hasOpenRouterEnv() || Boolean(process.env.GOOGLE_AI_API_KEY?.trim()),
};

const ALL_PROVIDERS: LlmKeyProviderName[] = ["openai", "anthropic", "gemini"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMentionPosition(text: string, names: string[]): number | null {
  const lower = text.toLowerCase();
  let best: number | null = null;
  for (const name of names) {
    const idx = lower.indexOf(name.toLowerCase());
    if (idx === -1) continue;
    const before = lower.slice(0, idx);
    const rank = (before.match(/\n/g)?.length ?? 0) + 1;
    if (best === null || rank < best) best = rank;
  }
  return best;
}

function extractQuote(text: string, names: string[]): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    for (const name of names) {
      if (sentence.toLowerCase().includes(name.toLowerCase())) {
        return sentence.trim().slice(0, 280);
      }
    }
  }
  return null;
}

function detectSentiment(text: string, names: string[]): LlmSentiment {
  const lower = text.toLowerCase();
  const mentioned = names.some((n) => lower.includes(n.toLowerCase()));
  if (!mentioned) return "not_mentioned";
  const pos = /\b(best|leading|excellent|recommend|strong|top|great|innovative|trusted)\b/i;
  const neg = /\b(poor|avoid|weak|lacking|bad|expensive|limited|issues|problems)\b/i;
  if (pos.test(text) && !neg.test(text)) return "positive";
  if (neg.test(text)) return "negative";
  return "neutral";
}

function findCompetitors(text: string, competitors: string[]): string[] {
  const found: string[] = [];
  for (const c of competitors) {
    if (new RegExp(escapeRegExp(c), "i").test(text)) found.push(c);
  }
  return found;
}

function analyzeResponse(
  brand: BrandQueryDefinition,
  queryText: string,
  queryCategory: LlmQueryCategory,
  provider: LlmKeyProviderName,
  model: string,
  fullResponse: string,
): LlmVisibilityQueryResult {
  const names = [brand.brandName, ...brand.brandAliases];
  const brandMentioned = names.some((n) => new RegExp(escapeRegExp(n), "i").test(fullResponse));
  const mentionPosition = brandMentioned ? findMentionPosition(fullResponse, names) : null;
  const sentiment = detectSentiment(fullResponse, names);
  const base = {
    brandName: brand.brandName,
    brandUrl: brand.brandUrl,
    llmProvider: provider,
    llmModel: model,
    queryText,
    queryCategory,
    brandMentioned,
    mentionPosition,
    sentiment,
    exactQuote: brandMentioned ? extractQuote(fullResponse, names) : null,
    competitorsMentioned: findCompetitors(fullResponse, brand.competitors),
    fullResponse,
  };
  return {
    ...base,
    visibilityScore: calculateQueryVisibilityScore(base),
    queriedAt: new Date().toISOString(),
  };
}

export function getAvailableLlmProviders(): LlmKeyProviderName[] {
  return ALL_PROVIDERS.filter((p) => PROVIDER_ENV[p]());
}

export async function runLlmVisibilityAnalysis(
  brand: BrandQueryDefinition,
  options?: { providers?: LlmKeyProviderName[]; maxQueries?: number },
): Promise<{ results: LlmVisibilityQueryResult[]; errors: string[] }> {
  const providers = options?.providers?.length ? options.providers : getAvailableLlmProviders();
  const errors: string[] = [];
  const results: LlmVisibilityQueryResult[] = [];

  if (providers.length === 0) {
    return { results, errors: ["No LLM API keys configured. Add keys in Settings → API Keys or .env.local."] };
  }

  const queries = brand.queries.slice(0, options?.maxQueries ?? brand.queries.length);

  for (const query of queries) {
    for (const provider of providers) {
      try {
        const instance = getLlmProviderInstance(provider);
        const requestId = randomUUID();
        const response = await instance.execute(query.text, {
          requestId,
          maxTokens: 1024,
          temperature: 0.3,
          systemPrompt:
            "You are a helpful industry analyst. Answer concisely with specific product and company names where relevant. Use bullet points when comparing options.",
        });
        results.push(
          analyzeResponse(brand, query.text, query.category, provider, response.model, response.rawResponse),
        );
      } catch (e) {
        errors.push(`${provider} @ "${query.text.slice(0, 40)}…": ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { results, errors };
}
