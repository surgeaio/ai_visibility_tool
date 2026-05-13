import type { AIModelKey, AnalysisResult, SentimentResult } from "./types";
import { analyzeSentiment } from "./sentiment";
import { detectPatterns } from "./recommendations";
import { hasAnthropic, hasOpenAI, isDemoMode } from "@/lib/config";

export type { AIModelKey } from "./types";

async function queryAIModel(model: AIModelKey, prompt: string): Promise<string> {
  if (model === "openai" && hasOpenAI()) {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1200,
    });
    return res.choices[0]?.message?.content ?? "";
  }
  if (model === "anthropic" && hasAnthropic()) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }

  // No silent synthetic narrative: use `analyzePromptOrDemo` / demo APIs when keys are absent.
  return "";
}

export function detectBrandMentions(
  response: string,
  brands: string[],
): { mentioned: boolean; positions: Record<string, number>; snippets: Record<string, string> } {
  const lower = response.toLowerCase();
  const positions: Record<string, number> = {};
  const snippets: Record<string, string> = {};
  let order = 1;
  for (const brand of brands) {
    const idx = lower.indexOf(brand.toLowerCase());
    if (idx !== -1) {
      if (!(brand in positions)) {
        positions[brand] = order;
        order += 1;
      }
      const start = Math.max(0, idx - 40);
      const end = Math.min(response.length, idx + brand.length + 40);
      snippets[brand] = response.slice(start, end);
    }
  }
  const mentioned = brands.some((b) => lower.includes(b.toLowerCase()));
  return { mentioned, positions, snippets };
}

function extractContext(snippet: string, brand: string): string {
  return snippet || brand;
}

function calculatePosition(rank: number | undefined): number {
  return rank ?? 99;
}

function aggregateVisibility(flags: boolean[]): number {
  if (!flags.length) return 0;
  return Math.round((flags.filter(Boolean).length / flags.length) * 100);
}

function aggregateSentiment(results: SentimentResult[]): SentimentResult {
  const score = Math.round(average(results.map((r) => r.score)));
  const sentiment = score >= 61 ? "positive" : score >= 41 ? "neutral" : "negative";
  return {
    sentiment,
    score,
    confidence: Math.round(average(results.map((r) => r.confidence))),
    positiveSignals: Array.from(new Set(results.flatMap((r) => r.positiveSignals))),
    negativeSignals: Array.from(new Set(results.flatMap((r) => r.negativeSignals))),
    keywords: Array.from(new Set(results.flatMap((r) => r.keywords))),
    pattern: results.find((r) => r.pattern)?.pattern ?? null,
  };
}

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function aggregatePosition(positions: number[]): number {
  if (!positions.length) return 0;
  return Math.round(average(positions) * 10) / 10;
}

export async function analyzePrompt(params: {
  prompt: string;
  brandName: string;
  competitors: string[];
  models: AIModelKey[];
}): Promise<AnalysisResult> {
  const brands = [params.brandName, ...params.competitors];

  const responses = await Promise.all(params.models.map((m) => queryAIModel(m, params.prompt)));

  const perModel: AnalysisResult["perModel"] = [];

  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    const model = params.models[i];
    const { mentioned, positions, snippets } = detectBrandMentions(response, brands);

    const sentimentContexts = brands.map((b) => extractContext(snippets[b] ?? "", b));
    const sentiments = await Promise.all(
      sentimentContexts.map((ctx, idx) =>
        ctx.length > 2 ? analyzeSentiment(ctx, brands[idx]) : Promise.resolve(defaultNeutral()),
      ),
    );

    const brandIdx = brands.indexOf(params.brandName);
    const brandSentiment = sentiments[brandIdx] ?? defaultNeutral();
    const brandPos = calculatePosition(positions[params.brandName]);

    perModel.push({
      model,
      response,
      visibility: mentioned && !!snippets[params.brandName],
      sentiment: brandSentiment,
      position: brandPos,
      positionsByBrand: positions,
    });
  }

  const visibilityFlags = perModel.map((p) => p.visibility);
  const sentimentAgg = aggregateSentiment(perModel.map((p) => p.sentiment));
  const positionAgg = aggregatePosition(perModel.map((p) => p.position));

  const patterns = detectPatterns(
    perModel.map((p) => ({
      visibility: p.visibility,
      sentiment: p.sentiment,
      position: p.position,
      positionsByBrand: p.positionsByBrand,
    })),
  );

  return {
    responses,
    visibilityPct: aggregateVisibility(visibilityFlags),
    sentiment: sentimentAgg,
    position: positionAgg,
    patterns,
    perModel,
    rawData: {
      responses,
      mentions: [],
      sentiments: perModel.map((p) => p.sentiment),
    },
  };
}

function defaultNeutral(): SentimentResult {
  return {
    sentiment: "neutral",
    score: 55,
    confidence: 60,
    positiveSignals: [],
    negativeSignals: [],
    keywords: [],
    pattern: null,
  };
}

export async function analyzePromptOrDemo(params: {
  prompt: string;
  brandName: string;
  competitors: string[];
  models: AIModelKey[];
}): Promise<AnalysisResult> {
  if (isDemoMode()) {
    return {
      responses: [
        `For startups, ${params.brandName} is often mentioned alongside HubSpot and Salesforce. ${params.brandName} is praised for UX; some reviews call pricing a consideration.`,
      ],
      visibilityPct: 63,
      sentiment: {
        sentiment: "positive",
        score: 82,
        confidence: 86,
        positiveSignals: ["modern UX"],
        negativeSignals: [],
        keywords: ["CRM", params.brandName],
        pattern: null,
      },
      position: 2.4,
      patterns: [],
      perModel: params.models.map((m) => ({
        model: m,
        response: `Demo response for ${m}: mentions ${params.brandName} and competitors.`,
        visibility: true,
        sentiment: {
          sentiment: "positive",
          score: 82,
          confidence: 80,
          positiveSignals: [],
          negativeSignals: [],
          keywords: [],
          pattern: null,
        },
        position: 2,
        positionsByBrand: { [params.brandName]: 2, HubSpot: 1 },
      })),
      rawData: { responses: [], mentions: [], sentiments: [] },
    };
  }
  return analyzePrompt(params);
}
