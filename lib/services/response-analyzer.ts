import Anthropic from "@anthropic-ai/sdk";

export interface AnalyzerInput {
  responseText: string;
  ownBrand: { name: string; domain?: string | null; aliases?: string[] };
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

export async function analyzeResponse(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY required for response analyzer");
  }

  const anthropic = new Anthropic({ apiKey });
  const allBrandNames = [
    input.ownBrand.name,
    ...(input.ownBrand.aliases ?? []),
    ...input.competitors.map((c) => c.name),
  ];

  const systemPrompt = `You are a precise brand analysis AI. Analyze the given AI response and extract:
1. Every brand from the candidate list that is mentioned
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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = message.content
    .filter((b) => b.type === "text")
    .map((b) => ("text" in b ? b.text : ""))
    .join("\n")
    .trim();

  const parsed = parseAnalyzerJson(rawText);
  const allBrands = parsed.brands_in_order ?? [];

  const ownLower = input.ownBrand.name.toLowerCase();
  const aliases = (input.ownBrand.aliases ?? []).map((a) => a.toLowerCase());
  const ownMention = allBrands.find((b) => {
    const n = b.name.toLowerCase();
    return n === ownLower || aliases.includes(n) || n.includes(ownLower);
  });

  const domains = extractDomains(input.responseText, input.rawSources);

  return {
    brandMentioned: Boolean(ownMention),
    brandPosition: ownMention?.position ?? null,
    brandSentiment: ownMention?.sentiment_score ?? null,
    brandSentimentLabel: ownMention?.sentiment_label ?? null,
    brandMentionContext: ownMention?.context_snippet ?? null,
    allBrandsMentioned: allBrands,
    domainsReferenced: domains,
    rawAnalyzerOutput: rawText,
  };
}
