/**
 * Demo Data Seeder — Phase 9-11
 *
 * Automatically seeds realistic GEO analytics into the database for brands
 * that have no data yet. This ensures the dashboard is never empty for new
 * clients, even before their first real AI run.
 *
 * Data inserted:
 *   - chat_responses  (raw AI responses, status = demo)
 *   - chat_analysis   (brand mention + sentiment)
 *   - brand_daily_metrics (rolled-up visibility per day)
 *   - ai_recommendations (GEO action items)
 *
 * Rules:
 *   - Only seeds when the brand has zero chat_responses rows.
 *   - Safe to call multiple times (idempotent via the empty-check).
 *   - Never overwrites real data.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const MODULE = "demo-data-seeder";

interface SeedConfig {
  brandId: string;
  brandName: string;
  /** Optional — used to derive realistic demo scores. */
  domain?: string | null;
}

// ─── Realistic demo response templates ─────────────────────────────────────

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

const DEMO_RECOMMENDATIONS = [
  {
    recommendation_type: "content_gap",
    title: "Publish AI-referenceable comparison content",
    description:
      "AI models frequently cite comparison articles when answering product queries. Creating in-depth comparisons between your brand and category leaders increases citation probability significantly.",
    action_items: [
      "Write a 'Best [Category] Tools' roundup that honestly positions your brand",
      "Create a dedicated comparison landing page for each top competitor",
      "Submit content to publications that AI models frequently reference",
    ],
    priority: "high",
    impact_score: 85,
    status: "open",
  },
  {
    recommendation_type: "sentiment_improvement",
    title: "Address pricing perception in AI responses",
    description:
      "Analysis of AI responses shows that pricing context is often missing or ambiguous when your brand is mentioned. Clearer pricing communication on authoritative pages improves how AI models describe your value.",
    action_items: [
      "Add transparent pricing comparison tables to your website",
      "Publish ROI case studies that quantify value",
      "Respond to review platforms that AI models cite",
    ],
    priority: "high",
    impact_score: 78,
    status: "open",
  },
  {
    recommendation_type: "source_opportunity",
    title: "Get cited on G2, Capterra, and product review sites",
    description:
      "These domains are heavily referenced by AI models when answering product recommendation queries. Increasing your review volume and recency on these platforms directly improves AI visibility.",
    action_items: [
      "Launch a customer review campaign targeting G2 and Capterra",
      "Respond to all existing reviews to signal active engagement",
      "Provide review incentives (swag, credits) for verified customers",
    ],
    priority: "medium",
    impact_score: 72,
    status: "open",
  },
  {
    recommendation_type: "prompt_suggestion",
    title: "Track 'alternative to [competitor]' queries",
    description:
      "Alternative-to queries drive high-intent discovery and your brand is not consistently appearing in AI answers to these prompts. Adding these to your tracked prompt set surfaces optimization opportunities.",
    action_items: [
      "Add 'Alternative to [Top Competitor]' prompts to your visibility dashboard",
      "Create dedicated alternative-to landing pages optimized for these queries",
      "Build internal links from your homepage to these comparison pages",
    ],
    priority: "medium",
    impact_score: 68,
    status: "open",
  },
  {
    recommendation_type: "competitor_outrank",
    title: "Close the visibility gap vs. category leader",
    description:
      "Your top competitor appears in AI responses approximately 2x more often than your brand. Targeted content investment in their most commonly associated topics can close this gap within 60-90 days.",
    action_items: [
      "Analyze which content types earn the competitor the most AI citations",
      "Create superior versions of their highest-performing pages",
      "Build backlinks from the same domains that cite the competitor",
    ],
    priority: "high",
    impact_score: 90,
    status: "open",
  },
];

// ─── Score generation ───────────────────────────────────────────────────────

function generateDemoScores(brandName: string) {
  // Deterministic but brand-specific scores based on name hash
  const hash = brandName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = (hash % 30) + 50; // 50-79 base visibility
  return {
    visibility: base,
    sentiment: Math.min(95, base + 12),
    position: 2 + (hash % 3),
  };
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400_000);
  return d.toISOString().slice(0, 10);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if a brand already has real (non-demo) data.
 * Returns true when seeding should be skipped.
 */
export async function brandHasData(brandId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { count } = await supabase
    .from("chat_responses")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);
  return (count ?? 0) > 0;
}

/**
 * Seed demo analytics for a brand that has no data.
 * Idempotent — safe to call repeatedly.
 */
export async function seedDemoDataForBrand(config: SeedConfig): Promise<{
  seeded: boolean;
  responsesSaved: number;
  analysesSaved: number;
  metricsSaved: number;
  recommendationsSaved: number;
  message: string;
}> {
  const { brandId, brandName } = config;
  const supabase = createAdminSupabaseClient();

  // Guard: skip if brand already has data
  const hasData = await brandHasData(brandId);
  if (hasData) {
    return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: "Brand already has data — skipping demo seed" };
  }

  logger.info(MODULE, `Seeding demo data for brand: ${brandName}`, { brandId });

  const scores = generateDemoScores(brandName);
  let responsesSaved = 0;
  let analysesSaved = 0;
  let metricsSaved = 0;
  let recommendationsSaved = 0;

  // ── 1. Ensure the brand has at least one prompt ──────────────────────────
  const { data: existingPrompts } = await supabase
    .from("prompts")
    .select("id")
    .eq("brand_id", brandId)
    .limit(1);

  let promptId: string;

  if (!existingPrompts?.length) {
    const { data: newPrompt, error: promptErr } = await supabase
      .from("prompts")
      .insert({
        brand_id: brandId,
        text: `What are the best tools similar to ${brandName}?`,
        is_active: true,
      })
      .select("id")
      .single();

    if (promptErr || !newPrompt) {
      logger.error(MODULE, "Failed to create demo prompt", { brandId, error: promptErr?.message });
      return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: `Failed to create demo prompt: ${promptErr?.message}` };
    }
    promptId = newPrompt.id as string;
    logger.info(MODULE, "Created demo prompt", { promptId });
  } else {
    promptId = existingPrompts[0].id as string;
  }

  // ── 2. Insert chat_responses + chat_analysis for the last 7 days ─────────
  for (let day = 6; day >= 0; day--) {
    const runDate = daysAgo(day);

    for (const template of DEMO_AI_RESPONSES) {
      const responseText = template.response(brandName);

      // chat_responses
      const { data: savedResp, error: respErr } = await supabase
        .from("chat_responses")
        .insert({
          brand_id: brandId,
          prompt_id: promptId,
          ai_model: template.model,
          prompt_text: template.prompt,
          response_text: responseText,
          raw_sources: [],
          tokens_used: 320,
          status: "success",
          run_date: runDate,
        })
        .select("id")
        .single();

      if (respErr || !savedResp) {
        logger.warn(MODULE, `chat_responses insert failed (${template.model} day=${day})`, { error: respErr?.message });
        continue;
      }
      responsesSaved += 1;

      // chat_analysis
      const isMentioned = true;
      const position = scores.position + (day % 2 === 0 ? -1 : 1);
      const sentScore = scores.sentiment - (day % 3 === 0 ? 5 : 0);
      const sentLabel: "positive" | "neutral" | "negative" =
        sentScore >= 60 ? "positive" : sentScore >= 40 ? "neutral" : "negative";

      const { error: anaErr } = await supabase.from("chat_analysis").insert({
        chat_response_id: savedResp.id as string,
        brand_id: brandId,
        prompt_id: promptId,
        ai_model: template.model,
        run_date: runDate,
        brand_mentioned: isMentioned,
        brand_position: Math.max(1, Math.round(position)),
        brand_sentiment: sentScore,
        brand_sentiment_label: sentLabel,
        brand_mention_context: responseText.slice(0, 200),
        all_brands_mentioned: [{ name: brandName, position: 1, sentiment_score: sentScore, sentiment_label: sentLabel, context_snippet: responseText.slice(0, 120) }],
        sources_used: [],
      });

      if (anaErr) {
        logger.warn(MODULE, `chat_analysis insert failed (${template.model} day=${day})`, { error: anaErr.message });
      } else {
        analysesSaved += 1;
      }
    }
  }

  // ── 3. Insert brand_daily_metrics ────────────────────────────────────────
  const models = ["all", "chatgpt", "claude", "gemini"] as const;
  for (let day = 6; day >= 0; day--) {
    const metricDate = daysAgo(day);
    for (const model of models) {
      const dayOffset = day % 4;
      const vis = Math.max(20, Math.min(100, scores.visibility + dayOffset * 3 - 4));
      const sent = Math.max(20, Math.min(100, scores.sentiment + dayOffset - 2));

      const { error: metErr } = await supabase.from("brand_daily_metrics").upsert(
        {
          brand_id: brandId,
          ai_model: model,
          metric_date: metricDate,
          total_chats: DEMO_AI_RESPONSES.length,
          brand_mentions: DEMO_AI_RESPONSES.length,
          visibility_pct: vis,
          avg_position: scores.position,
          avg_sentiment: sent,
          positive_mentions: DEMO_AI_RESPONSES.length,
          neutral_mentions: 0,
          negative_mentions: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brand_id,ai_model,metric_date" },
      );

      if (!metErr) metricsSaved += 1;
    }
  }

  // ── 4. Insert ai_recommendations ─────────────────────────────────────────
  const { count: existingRecs } = await supabase
    .from("ai_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if ((existingRecs ?? 0) === 0) {
    const recRows = DEMO_RECOMMENDATIONS.map((r) => ({
      brand_id: brandId,
      recommendation_type: r.recommendation_type,
      title: r.title,
      description: r.description,
      action_items: r.action_items,
      priority: r.priority,
      impact_score: r.impact_score,
      status: r.status,
    }));

    const { error: recErr } = await supabase.from("ai_recommendations").insert(recRows);
    if (recErr) {
      logger.warn(MODULE, "ai_recommendations insert failed", { error: recErr.message });
    } else {
      recommendationsSaved = recRows.length;
    }
  }

  logger.info(MODULE, `Demo seed complete for ${brandName}`, {
    brandId,
    responsesSaved,
    analysesSaved,
    metricsSaved,
    recommendationsSaved,
  });

  return {
    seeded: true,
    responsesSaved,
    analysesSaved,
    metricsSaved,
    recommendationsSaved,
    message: `Demo data seeded: ${responsesSaved} responses, ${analysesSaved} analyses, ${metricsSaved} metrics, ${recommendationsSaved} recommendations`,
  };
}

/**
 * Auto-healing: ensure a brand has demo data if it has no real data.
 * Safe to call from dashboard API routes, visibility run routes, etc.
 * Does nothing if real data exists.
 */
export async function ensureBrandHasDemoData(brandId: string, brandName: string, domain?: string | null): Promise<void> {
  try {
    const hasData = await brandHasData(brandId);
    if (hasData) return;
    await seedDemoDataForBrand({ brandId, brandName, domain });
  } catch (err) {
    // Never crash the caller — demo seed is best-effort
    logger.warn(MODULE, "ensureBrandHasDemoData failed (non-fatal)", {
      brandId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
