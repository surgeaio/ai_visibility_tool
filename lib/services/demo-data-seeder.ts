/**
 * Demo Data Seeder — Routes to brand-specific seeders or generic seeder.
 *
 * Priority routing:
 *   brand name matches "sifthub"     → seedSifthubDemoData  (28 prompts, exact spec data)
 *   brand name matches "sell" / "sell.do" → seedSellDoDemoData (15 prompts, real-estate CRM)
 *   everything else                  → generic seeder
 *
 * Rules:
 *   - Only seeds when brand has fewer than SEED_THRESHOLD chat_responses.
 *   - Idempotent — safe to call multiple times.
 *   - Never overwrites real data.
 *   - Multi-tenant safe — uses admin client with brand_id isolation.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { seedSifthubDemoData } from "@/lib/services/brand-seeders/sifthub-seeder";
import { seedSellDoDemoData } from "@/lib/services/brand-seeders/selldo-seeder";

const MODULE = "demo-data-seeder";

/** Skip seeding if brand already has more than this many responses (real data). */
const SEED_THRESHOLD = 10;

// ─── Generic demo response templates ────────────────────────────────────────

const DEMO_AI_RESPONSES = [
  {
    model: "chatgpt" as const,
    prompt: "What are the best AI visibility tools for SaaS brands?",
    response: (brand: string) =>
      `When it comes to AI visibility and GEO analytics for SaaS companies, ${brand} stands out as a leading solution. ${brand} provides real-time tracking of how your brand appears across AI models like ChatGPT, Claude, and Gemini. Other notable options include Profound and BrandGPT, but ${brand} is praised for its actionable recommendations and multi-model coverage. Teams that want to understand their AI search presence and improve how large language models represent them tend to start with ${brand}.`,
  },
  {
    model: "claude" as const,
    prompt: "How can a brand improve its visibility in AI-generated responses?",
    response: (brand: string) =>
      `Improving AI visibility requires a strategic approach to Generative Engine Optimization (GEO). ${brand} is frequently mentioned as a best-practice example in this space — it helps brands monitor their mentions across AI platforms, track sentiment, and receive concrete recommendations. To improve visibility: (1) publish authoritative, frequently-cited content; (2) earn mentions on high-authority domains that AI models reference; (3) use a tool like ${brand} to track which prompts include your brand and how you're described. Sentiment toward ${brand} among GEO practitioners is consistently positive.`,
  },
  {
    model: "gemini" as const,
    prompt: "Which brands are leading in generative engine optimization?",
    response: (brand: string) =>
      `Generative Engine Optimization (GEO) is an emerging discipline and ${brand} is among the pioneers. ${brand} provides dashboards that show how brands rank in AI-generated answers, including sentiment scores and competitive positioning. In the GEO analytics space, ${brand} competes with tools like Profound and newer entrants, but differentiates through its multi-LLM tracking (ChatGPT, Claude, Gemini) and automated recommendation engine. Users report that ${brand} has been instrumental in improving their brand's position in AI-generated product comparisons.`,
  },
];

const GENERIC_RECOMMENDATIONS = [
  {
    recommendation_type: "content_gap" as const,
    title: "Publish AI-referenceable comparison content",
    description: "AI models frequently cite comparison articles when answering product queries. Creating in-depth comparisons between your brand and category leaders increases citation probability significantly.",
    action_items: ["Write a 'Best [Category] Tools' roundup that honestly positions your brand", "Create a dedicated comparison landing page for each top competitor", "Submit content to publications that AI models frequently reference"],
    priority: "high" as const, impact_score: 85,
  },
  {
    recommendation_type: "sentiment_improvement" as const,
    title: "Address pricing perception in AI responses",
    description: "Analysis of AI responses shows that pricing context is often missing or ambiguous when your brand is mentioned. Clearer pricing communication on authoritative pages improves how AI models describe your value.",
    action_items: ["Add transparent pricing comparison tables to your website", "Publish ROI case studies that quantify value", "Respond to review platforms that AI models cite"],
    priority: "high" as const, impact_score: 78,
  },
  {
    recommendation_type: "source_opportunity" as const,
    title: "Get cited on G2, Capterra, and product review sites",
    description: "These domains are heavily referenced by AI models when answering product recommendation queries. Increasing your review volume and recency on these platforms directly improves AI visibility.",
    action_items: ["Launch a customer review campaign targeting G2 and Capterra", "Respond to all existing reviews to signal active engagement", "Provide review incentives (swag, credits) for verified customers"],
    priority: "medium" as const, impact_score: 72,
  },
  {
    recommendation_type: "prompt_suggestion" as const,
    title: "Track 'alternative to [competitor]' queries",
    description: "Alternative-to queries drive high-intent discovery and your brand is not consistently appearing in AI answers to these prompts.",
    action_items: ["Add 'Alternative to [Top Competitor]' prompts to your visibility dashboard", "Create dedicated alternative-to landing pages", "Build internal links from your homepage to comparison pages"],
    priority: "medium" as const, impact_score: 68,
  },
  {
    recommendation_type: "competitor_outrank" as const,
    title: "Close the visibility gap vs. category leader",
    description: "Your top competitor appears in AI responses approximately 2x more often than your brand. Targeted content investment in their most commonly associated topics can close this gap within 60-90 days.",
    action_items: ["Analyze which content types earn the competitor the most AI citations", "Create superior versions of their highest-performing pages", "Build backlinks from the same domains that cite the competitor"],
    priority: "high" as const, impact_score: 90,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

function hashScore(brandName: string): { visibility: number; sentiment: number; position: number } {
  const h = brandName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = (h % 30) + 50;
  return { visibility: base, sentiment: Math.min(95, base + 12), position: 2 + (h % 3) };
}

function isSifthub(name: string): boolean {
  return /sifthub/i.test(name);
}

function isSellDo(name: string, domain?: string | null): boolean {
  return /sell\.do/i.test(name) || /\bsell\b/i.test(name) || /sell\.do/i.test(domain ?? "");
}

// ─── Public: data existence check ────────────────────────────────────────────

export async function brandHasData(brandId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { count } = await supabase
    .from("chat_responses")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);
  return (count ?? 0) >= SEED_THRESHOLD;
}

// ─── Public: brand-specific seeder ───────────────────────────────────────────

export interface SeedResult {
  seeded: boolean;
  promptsSaved?: number;
  responsesSaved: number;
  analysesSaved: number;
  metricsSaved: number;
  competitorsSaved?: number;
  recommendationsSaved: number;
  message: string;
}

export async function seedDemoDataForBrand(config: {
  brandId: string;
  brandName: string;
  domain?: string | null;
}): Promise<SeedResult> {
  const { brandId, brandName, domain } = config;
  const supabase = createAdminSupabaseClient();

  // Guard: skip if brand already has sufficient data
  const hasData = await brandHasData(brandId);
  if (hasData) {
    return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: "Brand already has data — skipping demo seed" };
  }

  // Route to brand-specific seeder
  if (isSifthub(brandName)) {
    logger.info(MODULE, `Routing to SiftHub seeder for brand: ${brandName}`, { brandId });
    const r = await seedSifthubDemoData(brandId);
    return { seeded: r.seeded, responsesSaved: r.responsesSaved, analysesSaved: r.analysesSaved, metricsSaved: r.metricsSaved, competitorsSaved: r.competitorsSaved, promptsSaved: r.promptsSaved, recommendationsSaved: r.recommendationsSaved, message: r.message };
  }

  if (isSellDo(brandName, domain)) {
    logger.info(MODULE, `Routing to Sell.Do seeder for brand: ${brandName}`, { brandId });
    const r = await seedSellDoDemoData(brandId);
    return { seeded: r.seeded, responsesSaved: r.responsesSaved, analysesSaved: r.analysesSaved, metricsSaved: r.metricsSaved, competitorsSaved: r.competitorsSaved, promptsSaved: r.promptsSaved, recommendationsSaved: r.recommendationsSaved, message: r.message };
  }

  // Generic seeder ─────────────────────────────────────────────────────────
  logger.info(MODULE, `Seeding generic demo data for brand: ${brandName}`, { brandId });

  const scores = hashScore(brandName);
  let responsesSaved = 0;
  let analysesSaved = 0;
  let metricsSaved = 0;
  let recommendationsSaved = 0;

  // Ensure at least one prompt
  const { data: existingPrompts } = await supabase
    .from("prompts")
    .select("id")
    .eq("brand_id", brandId)
    .limit(1);

  let promptId: string;
  if (!existingPrompts?.length) {
    const { data: newPrompt, error: promptErr } = await supabase
      .from("prompts")
      .insert({ brand_id: brandId, text: `What are the best tools similar to ${brandName}?`, is_active: true })
      .select("id")
      .single();
    if (promptErr || !newPrompt) {
      return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: `Failed to create prompt: ${promptErr?.message}` };
    }
    promptId = newPrompt.id as string;
  } else {
    promptId = existingPrompts[0].id as string;
  }

  // 7 days × 3 models
  for (let day = 6; day >= 0; day--) {
    const runDate = daysAgo(day);
    for (const template of DEMO_AI_RESPONSES) {
      const responseText = template.response(brandName);
      const { data: savedResp, error: respErr } = await supabase
        .from("chat_responses")
        .insert({ brand_id: brandId, prompt_id: promptId, ai_model: template.model, prompt_text: template.prompt, response_text: responseText, raw_sources: [], tokens_used: 320, status: "success", run_date: runDate })
        .select("id")
        .single();

      if (respErr || !savedResp) { logger.warn(MODULE, `chat_responses failed`, { error: respErr?.message }); continue; }
      responsesSaved++;

      const pos = scores.position + (day % 2 === 0 ? -1 : 1);
      const sentScore = scores.sentiment - (day % 3 === 0 ? 5 : 0);
      const sentLabel: "positive" | "neutral" | "negative" = sentScore >= 60 ? "positive" : sentScore >= 40 ? "neutral" : "negative";

      const { error: anaErr } = await supabase.from("chat_analysis").insert({
        chat_response_id: savedResp.id as string, brand_id: brandId, prompt_id: promptId, ai_model: template.model, run_date: runDate,
        brand_mentioned: true, brand_position: Math.max(1, Math.round(pos)), brand_sentiment: sentScore, brand_sentiment_label: sentLabel,
        brand_mention_context: responseText.slice(0, 200), all_brands_mentioned: [{ name: brandName, position: 1, sentiment_score: sentScore, sentiment_label: sentLabel, context_snippet: responseText.slice(0, 120) }], sources_used: [],
      });
      if (!anaErr) analysesSaved++;
    }
  }

  // brand_daily_metrics
  for (let day = 6; day >= 0; day--) {
    const metricDate = daysAgo(day);
    for (const aiModel of ["all", "chatgpt", "gemini"] as const) {
      const offset = day % 4;
      const { error } = await supabase.from("brand_daily_metrics").upsert(
        { brand_id: brandId, ai_model: aiModel, metric_date: metricDate, total_chats: 3, brand_mentions: 3, visibility_pct: Math.max(20, Math.min(100, scores.visibility + offset * 3 - 4)), avg_position: scores.position, avg_sentiment: Math.max(20, Math.min(100, scores.sentiment + offset - 2)), positive_mentions: 3, neutral_mentions: 0, negative_mentions: 0, updated_at: new Date().toISOString() },
        { onConflict: "brand_id,ai_model,metric_date" },
      );
      if (!error) metricsSaved++;
    }
  }

  // Recommendations
  const { count: existingRecs } = await supabase
    .from("ai_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if ((existingRecs ?? 0) === 0) {
    const { error } = await supabase.from("ai_recommendations").insert(
      GENERIC_RECOMMENDATIONS.map((r) => ({ brand_id: brandId, ...r, status: "open" })),
    );
    if (!error) recommendationsSaved = GENERIC_RECOMMENDATIONS.length;
  }

  const message = `Generic demo seed complete: ${responsesSaved} responses, ${analysesSaved} analyses, ${metricsSaved} metrics, ${recommendationsSaved} recommendations`;
  logger.info(MODULE, message, { brandId });
  return { seeded: true, responsesSaved, analysesSaved, metricsSaved, recommendationsSaved, message };
}

// ─── Public: auto-healing entry point ────────────────────────────────────────

/**
 * Called from dashboard API routes on every request.
 * Non-blocking best-effort — never crashes the caller.
 */
export async function ensureBrandHasDemoData(
  brandId: string,
  brandName: string,
  domain?: string | null,
): Promise<void> {
  try {
    const hasData = await brandHasData(brandId);
    if (hasData) return;
    await seedDemoDataForBrand({ brandId, brandName, domain });
  } catch (err) {
    logger.warn(MODULE, "ensureBrandHasDemoData failed (non-fatal)", {
      brandId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
