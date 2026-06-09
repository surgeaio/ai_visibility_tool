import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS } from "@/lib/ai/models";
import {
  buildBrandNameVariations,
  calculateBrandSentiment,
  candidateMatchesOwnBrand,
  detectBrandMention,
  extractMentionContext,
  sentimentLabelFromScore,
  type BrandForDetection,
} from "@/lib/services/brand-mention-detector";

export interface AnalyzerInput {
  responseText: string;
  ownBrand: BrandForDetection;
  competitors: Array<{ name: string; domain?: string | null }>;
  rawSources?: Array<{ url: string }>;
}

export interface BrandMention {
  name: string;
  position: number;
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  context_snippet: string;
}

export interface AnalyzerOutput {
  brandMentioned: boolean;
  brandPosition: number | null;
  brandSentiment: number | null;
  brandSentimentLabel: "positive" | "neutral" | "negative" | null;
  brandMentionContext: string | null;
  allBrandsMentioned: BrandMention[];
  domainsReferenced: string[];
  rawAnalyzerOutput: string;
  detectionSource: "anthropic" | "local" | "hybrid";
}

function extractDomains(text: string, sources: Array<{ url: string }> = []): string[] {
  const domains = new Set<string>();
  for (const s of sources) {
    try {
      domains.add(new URL(s.url).hostname.replace(/^www\./, ""));
    } catch {
      /* skip invalid */
    }
  }
  const urlRegex = /https?:\/\/([^\s)\]"']+)/g;
  const matches = text.match(urlRegex) ?? [];
  for (const u of matches) {
    try {
      domains.add(new URL(u).hostname.replace(/^www\./, ""));
    } catch {
      /* skip */
    }
  }
  return Array.from(domains);
}

function parseAnalyzerJson(rawText: string): { brands_in_order: BrandMention[] } {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as { brands_in_order: BrandMention[] };
  } catch {
    return { brands_in_order: [] };
  }
}

/** Local-only brand detection (no Anthropic). Safe fallback when API analysis fails. */
export function analyzeResponseLocal(input: AnalyzerInput): AnalyzerOutput {
  const detection = detectBrandMention(input.responseText, input.ownBrand);
  const sentimentScore = detection.mentioned
    ? calculateBrandSentiment(input.responseText, input.ownBrand)
    : null;
  const label =
    sentimentScore != null ? sentimentLabelFromScore(sentimentScore) : null;

  return {
    brandMentioned: detection.mentioned,
    brandPosition: detection.position,
    brandSentiment: sentimentScore,
    brandSentimentLabel: label,
    brandMentionContext: detection.mentioned
      ? extractMentionContext(input.responseText, input.ownBrand)
      : null,
    allBrandsMentioned: [],
    domainsReferenced: extractDomains(input.responseText, input.rawSources),
    rawAnalyzerOutput: "",
    detectionSource: "local",
  };
}

export async function analyzeResponse(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const local = analyzeResponseLocal(input);
  const nameVariations = buildBrandNameVariations(input.ownBrand);
  const directKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!directKey) {
    console.warn(
      "[response-analyzer] No ANTHROPIC_API_KEY — using local brand detection",
    );
    console.log(
      `[response-analyzer] Brand: ${input.ownBrand.name} | Mentioned: ${local.brandMentioned} | Position: ${local.brandPosition}`,
    );
    return local;
  }

  const allBrandNames = [
    ...new Set([
      input.ownBrand.name,
      ...nameVariations,
      ...(input.ownBrand.aliases ?? []),
      ...input.competitors.map((c) => c.name),
    ]),
  ];

  const systemPrompt = `You are a precise brand analysis AI. Analyze the given AI response and extract:
1. Every brand from the candidate list that is mentioned (including domain names and aliases)
2. The ORDER (position) they appear in (1 = first mentioned, 2 = second, etc.)
3. Sentiment toward each brand (0-100 score where 0=very negative, 50=neutral, 100=very positive)
4. A short context snippet (max 200 chars) showing the mention

Return ONLY valid JSON. No markdown, no code fences, no commentary.`;

  const userPrompt = `CANDIDATE BRANDS to look for: ${JSON.stringify(allBrandNames)}

AI RESPONSE TO ANALYZE:
"""
${input.responseText}
"""

Return JSON in this exact format:
{
  "brands_in_order": [
    {
      "name": "<exact brand name from candidate list>",
      "position": <integer>,
      "sentiment_score": <0-100>,
      "sentiment_label": "<positive|neutral|negative>",
      "context_snippet": "<text around the mention>"
    }
  ]
}

If no candidate brands appear, return: { "brands_in_order": [] }`;

  let rawText = "";
  try {
    const anthropic = new Anthropic({
      apiKey: directKey!,
      baseURL: "https://api.anthropic.com",
    });
    const message = await anthropic.messages.create({
      model: AI_MODELS.claude,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n")
      .trim();
  } catch (err) {
    console.error("[response-analyzer] analyzer call failed, using local detection:", err);
    return { ...local, rawAnalyzerOutput: "" };
  }

  const parsed = parseAnalyzerJson(rawText);
  const allBrands = parsed.brands_in_order ?? [];

  const ownMention = allBrands.find((b) => candidateMatchesOwnBrand(b.name, input.ownBrand));

  const domains = extractDomains(input.responseText, input.rawSources);

  let brandMentioned = Boolean(ownMention) || local.brandMentioned;
  let brandPosition = ownMention?.position ?? local.brandPosition;
  let brandSentiment = ownMention?.sentiment_score ?? local.brandSentiment;
  let brandSentimentLabel = ownMention?.sentiment_label ?? local.brandSentimentLabel;
  let brandMentionContext = ownMention?.context_snippet ?? local.brandMentionContext;

  if (local.brandMentioned && !ownMention) {
    brandMentioned = true;
    brandPosition = brandPosition ?? local.brandPosition;
    brandSentiment = brandSentiment ?? local.brandSentiment;
    brandSentimentLabel = brandSentimentLabel ?? local.brandSentimentLabel;
    brandMentionContext = brandMentionContext ?? local.brandMentionContext;
  }

  const detectionSource: AnalyzerOutput["detectionSource"] =
    ownMention && local.brandMentioned
      ? "hybrid"
      : ownMention
        ? "anthropic"
        : local.brandMentioned
          ? "local"
          : "anthropic";

  console.log(
    `[response-analyzer] Brand: ${input.ownBrand.name} | Source: ${detectionSource} | Mentioned: ${brandMentioned} | Position: ${brandPosition}`,
  );

  return {
    brandMentioned,
    brandPosition,
    brandSentiment,
    brandSentimentLabel,
    brandMentionContext,
    allBrandsMentioned: allBrands,
    domainsReferenced: domains,
    rawAnalyzerOutput: rawText,
    detectionSource,
  };
}
