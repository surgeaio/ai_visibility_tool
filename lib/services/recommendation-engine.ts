import OpenAI from "openai";
import { UserApiKeysRepository } from "@/lib/repositories/user-api-keys.repo";

export interface EngineRecommendation {
  id: string;
  title: string;
  category: "llm" | "google" | "website" | "content" | "competitor";
  priority: "critical" | "high" | "medium" | "low";
  summary: string;
}

type AiRecPayload = {
  title: string;
  category: EngineRecommendation["category"];
  priority: EngineRecommendation["priority"];
  summary: string;
};

function staticFallback(brandName: string): EngineRecommendation[] {
  return [
    {
      id: "rec-static-1",
      title: `Improve ${brandName} visibility in AI answers`,
      category: "llm",
      priority: "high",
      summary: "Add comparison and FAQ content that assistants can quote with clear positioning.",
    },
    {
      id: "rec-static-2",
      title: "Target page-two keywords",
      category: "google",
      priority: "high",
      summary: "Expand pages ranking 11–30 with depth, internal links, and structured FAQs.",
    },
    {
      id: "rec-static-3",
      title: "Fix technical SEO blockers",
      category: "website",
      priority: "medium",
      summary: "Resolve missing titles, duplicate H1s, and thin pages surfaced by your last audit.",
    },
  ];
}

export class RecommendationEngine {
  constructor(private readonly userId: string) {}

  async generateAll(brandId: string, brandName: string): Promise<EngineRecommendation[]> {
    const keysRepo = new UserApiKeysRepository();
    const keys = await keysRepo.listActiveLlmKeysDecrypted(this.userId);
    const openaiKey = keys.find((k) => k.provider === "openai")?.apiKey;
    if (!openaiKey) {
      return staticFallback(brandName);
    }

    const client = new OpenAI({ apiKey: openaiKey, timeout: 60_000 });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a GEO + SEO strategist. Return JSON: { "items": AiRecPayload[] } where each item has title, category (one of llm|google|website|content|competitor), priority (critical|high|medium|low), summary (2-3 sentences).`,
        },
        {
          role: "user",
          content: `Brand id: ${brandId}. Brand name: ${brandName}. Propose 6 concrete, non-overlapping recommendations.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{"items":[]}';
    let parsed: { items: AiRecPayload[] };
    try {
      parsed = JSON.parse(raw) as { items: AiRecPayload[] };
    } catch {
      return staticFallback(brandName);
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.slice(0, 10).map((item, i) => ({
      id: `ai-rec-${brandId}-${i}`,
      title: item.title,
      category: item.category,
      priority: item.priority,
      summary: item.summary,
    }));
  }
}
