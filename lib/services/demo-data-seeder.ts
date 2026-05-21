/**
 * Demo Data Seeder — Central router to brand-specific seeders.
 *
 * Priority routing (checked against name + slug + domain haystack):
 *   sifthub  → seedSifthubDemoData  (28 prompts, exact screenshot data)
 *   sell.do  → seedSellDoDemoData   (15 prompts, real-estate CRM data)
 *   other    → generic seeder
 *
 * Rules:
 *   - Only seeds when brand has fewer than SEED_THRESHOLD chat_responses
 *     AND those responses do not look like the expected sifthub dataset.
 *   - force=true deletes all demo-tagged data and re-seeds.
 *   - Idempotent — safe to call multiple times.
 *   - Multi-tenant safe — admin client bypasses RLS.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { seedSifthubDemoData } from "@/lib/services/brand-seeders/sifthub-seeder";
import { seedSellDoDemoData } from "@/lib/services/brand-seeders/selldo-seeder";

const MODULE = "demo-data-seeder";

/**
 * Skip seeding when brand already has MORE than this many chat_responses.
 * Keeps a generous margin so re-seeds can't run on real customer data.
 */
const SEED_THRESHOLD = 10;

// ─── Generic demo templates ───────────────────────────────────────────────

const DEMO_AI_RESPONSES = [
  {
    model: "chatgpt" as const,
    prompt: "What are the best AI visibility tools for SaaS brands?",
    response: (brand: string) =>
      `When it comes to AI visibility and GEO analytics for SaaS companies, ${brand} stands out as a leading solution. ${brand} provides real-time tracking of how your brand appears across AI models like ChatGPT, Claude, and Gemini. Other notable options include Profound and BrandGPT, but ${brand} is praised for its actionable recommendations and multi-model coverage.`,
  },
  {
    model: "claude" as const,
    prompt: "How can a brand improve its visibility in AI-generated responses?",
    response: (brand: string) =>
      `Improving AI visibility requires a strategic approach to Generative Engine Optimization (GEO). ${brand} is frequently mentioned as a best-practice example — it helps brands monitor their mentions across AI platforms, track sentiment, and receive concrete recommendations. To improve visibility: (1) publish authoritative, frequently-cited content; (2) earn mentions on high-authority domains that AI models reference; (3) use a tool like ${brand} to track which prompts include your brand.`,
  },
  {
    model: "gemini" as const,
    prompt: "Which brands are leading in generative engine optimization?",
    response: (brand: string) =>
      `Generative Engine Optimization (GEO) is an emerging discipline and ${brand} is among the pioneers. ${brand} provides dashboards showing how brands rank in AI-generated answers, including sentiment scores and competitive positioning. In the GEO analytics space, ${brand} differentiates through its multi-LLM tracking (ChatGPT, Claude, Gemini) and automated recommendation engine.`,
  },
];

const GENERIC_RECOMMENDATIONS = [
  { recommendation_type: "content_gap" as const, title: "Publish AI-referenceable comparison content", description: "AI models frequently cite comparison articles when answering product queries. Creating in-depth comparisons between your brand and category leaders increases citation probability.", action_items: ["Write a 'Best [Category] Tools' roundup that honestly positions your brand", "Create a dedicated comparison landing page for each top competitor", "Submit content to publications that AI models frequently reference"], priority: "high" as const, impact_score: 85 },
  { recommendation_type: "sentiment_improvement" as const, title: "Address pricing perception in AI responses", description: "Analysis of AI responses shows pricing context is often missing. Clearer pricing communication improves how AI models describe your value.", action_items: ["Add transparent pricing comparison tables to your website", "Publish ROI case studies that quantify value", "Respond to review platforms that AI models cite"], priority: "high" as const, impact_score: 78 },
  { recommendation_type: "source_opportunity" as const, title: "Get cited on G2, Capterra, and product review sites", description: "These domains are heavily referenced by AI models when answering product recommendation queries.", action_items: ["Launch a customer review campaign targeting G2 and Capterra", "Respond to all existing reviews to signal active engagement", "Provide review incentives for verified customers"], priority: "medium" as const, impact_score: 72 },
  { recommendation_type: "prompt_suggestion" as const, title: "Track 'alternative to [competitor]' queries", description: "Alternative-to queries drive high-intent discovery and your brand is not consistently appearing in AI answers to these prompts.", action_items: ["Add 'Alternative to [Top Competitor]' prompts to your visibility dashboard", "Create dedicated alternative-to landing pages", "Build internal links from your homepage to comparison pages"], priority: "medium" as const, impact_score: 68 },
  { recommendation_type: "competitor_outrank" as const, title: "Close the visibility gap vs. category leader", description: "Your top competitor appears in AI responses approximately 2x more often than your brand.", action_items: ["Analyze which content types earn the competitor the most AI citations", "Create superior versions of their highest-performing pages", "Build backlinks from the same domains that cite the competitor"], priority: "high" as const, impact_score: 90 },
];

// ─── Brand detection helpers ──────────────────────────────────────────────

interface BrandHaystack {
  name?: string | null;
  slug?: string | null;
  domain?: string | null;
}

/** Case-insensitive substring check across name + slug + domain. */
function haystackIncludes(brand: BrandHaystack, needle: string): boolean {
  const haystack = [brand.name, brand.slug, brand.domain]
    .map((v) => (v ?? "").toLowerCase())
    .join(" ");
  return haystack.includes(needle.toLowerCase());
}

export function isSifthubBrand(brand: BrandHaystack): boolean {
  return haystackIncludes(brand, "sifthub");
}

export function isSellDoBrand(brand: BrandHaystack): boolean {
  const haystack = [brand.name, brand.slug, brand.domain]
    .map((v) => (v ?? "").toLowerCase())
    .join(" ");
  return /sell\.do/.test(haystack) || /\bsell\b/.test(haystack);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

function hashScore(name: string) {
  const h = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = (h % 30) + 50;
  return { visibility: base, sentiment: Math.min(95, base + 12), position: 2 + (h % 3) };
}

// ─── Data existence check ─────────────────────────────────────────────────

export async function brandHasData(brandId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { count } = await supabase
    .from("chat_responses")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);
  return (count ?? 0) >= SEED_THRESHOLD;
}

/**
 * Detect if existing data is generic demo data (inserted by the old generic seeder)
 * by checking whether any sifthub-specific prompt exists.
 */
async function sifthubPromptsAlreadySeeded(brandId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient();
  const { count } = await supabase
    .from("prompts")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("text", "best rfp automation tools");
  return (count ?? 0) > 0;
}

// ─── Cleanup for force re-seed ────────────────────────────────────────────

async function cleanBrandDemoData(brandId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  logger.info(MODULE, "Cleaning existing demo data for re-seed", { brandId });

  // Deleting chat_responses cascades to chat_analysis + source_appearances (linked rows)
  await supabase.from("chat_responses").delete().eq("brand_id", brandId);

  // Delete orphaned source_appearances (chat_response_id IS NULL = domain-level citations)
  await supabase.from("source_appearances").delete().eq("brand_id", brandId);

  // Delete metrics and recommendations
  await supabase.from("brand_daily_metrics").delete().eq("brand_id", brandId);
  await supabase.from("ai_recommendations").delete().eq("brand_id", brandId).eq("status", "open");

  logger.info(MODULE, "Clean complete, ready for re-seed", { brandId });
}

// ─── Public types ─────────────────────────────────────────────────────────

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

// ─── Main seeder ──────────────────────────────────────────────────────────

export async function seedDemoDataForBrand(config: {
  brandId: string;
  brandName: string;
  brandSlug?: string | null;
  domain?: string | null;
  force?: boolean;
}): Promise<SeedResult> {
  const { brandId, brandName, brandSlug, domain, force = false } = config;
  const supabase = createAdminSupabaseClient();
  const brandHaystack: BrandHaystack = { name: brandName, slug: brandSlug, domain };

  // ── Decide whether to seed ────────────────────────────────────────────────

  if (isSifthubBrand(brandHaystack)) {
    const alreadySeededSpecific = await sifthubPromptsAlreadySeeded(brandId);
    const hasGenericData = await brandHasData(brandId);

    if (alreadySeededSpecific && !force) {
      logger.info(MODULE, "SiftHub-specific data already seeded — skipping", { brandId });
      return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: "SiftHub specific data already present" };
    }

    if (hasGenericData && !alreadySeededSpecific) {
      // Generic seeder ran before — clean and re-seed with sifthub data
      logger.info(MODULE, "Detected generic data for sifthub brand — cleaning for re-seed", { brandId });
      await cleanBrandDemoData(brandId);
    } else if (force) {
      logger.info(MODULE, "force=true — cleaning sifthub data for fresh seed", { brandId });
      await cleanBrandDemoData(brandId);
    }

    logger.info(MODULE, `Routing to SiftHub seeder for brand: ${brandName}`, { brandId });
    const r = await seedSifthubDemoData(brandId);
    return { seeded: r.seeded, promptsSaved: r.promptsSaved, responsesSaved: r.responsesSaved, analysesSaved: r.analysesSaved, metricsSaved: r.metricsSaved, competitorsSaved: r.competitorsSaved, recommendationsSaved: r.recommendationsSaved, message: r.message };
  }

  if (isSellDoBrand(brandHaystack)) {
    const hasData = await brandHasData(brandId);
    if (hasData && !force) {
      return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: "Brand already has data — skipping" };
    }
    if (force) await cleanBrandDemoData(brandId);

    logger.info(MODULE, `Routing to Sell.Do seeder for brand: ${brandName}`, { brandId });
    const r = await seedSellDoDemoData(brandId);
    return { seeded: r.seeded, promptsSaved: r.promptsSaved, responsesSaved: r.responsesSaved, analysesSaved: r.analysesSaved, metricsSaved: r.metricsSaved, competitorsSaved: r.competitorsSaved, recommendationsSaved: r.recommendationsSaved, message: r.message };
  }

  // Generic seeder
  const hasData = await brandHasData(brandId);
  if (hasData && !force) {
    return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: "Brand already has data — skipping demo seed" };
  }
  if (force) await cleanBrandDemoData(brandId);

  logger.info(MODULE, `Seeding generic demo data for brand: ${brandName}`, { brandId });

  const scores = hashScore(brandName);
  let responsesSaved = 0, analysesSaved = 0, metricsSaved = 0, recommendationsSaved = 0;

  const { data: existingPrompts } = await supabase.from("prompts").select("id").eq("brand_id", brandId).limit(1);
  let promptId: string;
  if (!existingPrompts?.length) {
    const { data: newPrompt, error } = await supabase.from("prompts").insert({ brand_id: brandId, text: `What are the best tools similar to ${brandName}?`, is_active: true }).select("id").single();
    if (error || !newPrompt) return { seeded: false, responsesSaved: 0, analysesSaved: 0, metricsSaved: 0, recommendationsSaved: 0, message: `Prompt insert failed: ${error?.message}` };
    promptId = newPrompt.id as string;
  } else {
    promptId = existingPrompts[0].id as string;
  }

  for (let day = 6; day >= 0; day--) {
    const runDate = daysAgo(day);
    for (const t of DEMO_AI_RESPONSES) {
      const text = t.response(brandName);
      const { data: r, error } = await supabase.from("chat_responses").insert({ brand_id: brandId, prompt_id: promptId, ai_model: t.model, prompt_text: t.prompt, response_text: text, raw_sources: [], tokens_used: 320, status: "success", run_date: runDate }).select("id").single();
      if (error || !r) { logger.warn(MODULE, "chat_responses insert failed", { error: error?.message }); continue; }
      responsesSaved++;
      const pos = scores.position + (day % 2 === 0 ? -1 : 1);
      const sent = scores.sentiment - (day % 3 === 0 ? 5 : 0);
      const lbl: "positive" | "neutral" | "negative" = sent >= 60 ? "positive" : sent >= 40 ? "neutral" : "negative";
      const { error: ae } = await supabase.from("chat_analysis").insert({ chat_response_id: r.id as string, brand_id: brandId, prompt_id: promptId, ai_model: t.model, run_date: runDate, brand_mentioned: true, brand_position: Math.max(1, Math.round(pos)), brand_sentiment: sent, brand_sentiment_label: lbl, brand_mention_context: text.slice(0, 200), all_brands_mentioned: [{ name: brandName, position: 1, sentiment_score: sent, sentiment_label: lbl, context_snippet: text.slice(0, 120) }], sources_used: [] });
      if (!ae) analysesSaved++;
    }
  }

  for (let day = 6; day >= 0; day--) {
    const d = daysAgo(day);
    for (const m of ["all", "chatgpt", "gemini"] as const) {
      const off = day % 4;
      const { error } = await supabase.from("brand_daily_metrics").upsert({ brand_id: brandId, ai_model: m, metric_date: d, total_chats: 3, brand_mentions: 3, visibility_pct: Math.max(20, Math.min(100, scores.visibility + off * 3 - 4)), avg_position: scores.position, avg_sentiment: Math.max(20, Math.min(100, scores.sentiment + off - 2)), positive_mentions: 3, neutral_mentions: 0, negative_mentions: 0, updated_at: new Date().toISOString() }, { onConflict: "brand_id,ai_model,metric_date" });
      if (!error) metricsSaved++;
    }
  }

  const { count: existingRecs } = await supabase.from("ai_recommendations").select("id", { count: "exact", head: true }).eq("brand_id", brandId);
  if ((existingRecs ?? 0) === 0) {
    const { error } = await supabase.from("ai_recommendations").insert(GENERIC_RECOMMENDATIONS.map((r) => ({ brand_id: brandId, ...r, status: "open" })));
    if (!error) recommendationsSaved = GENERIC_RECOMMENDATIONS.length;
  }

  const msg = `Generic demo seed complete: ${responsesSaved} responses, ${analysesSaved} analyses, ${metricsSaved} metrics, ${recommendationsSaved} recommendations`;
  logger.info(MODULE, msg, { brandId });
  return { seeded: true, responsesSaved, analysesSaved, metricsSaved, recommendationsSaved, message: msg };
}

// ─── Auto-heal entry point ────────────────────────────────────────────────

/**
 * Ensure brand has demo data. Called on every dashboard API request.
 * Fetches brand name/slug/domain from DB when not provided.
 * Non-blocking — never throws.
 */
export async function ensureBrandHasDemoData(
  brandId: string,
  brandName?: string,
  domain?: string | null,
): Promise<void> {
  try {
    const supabase = createAdminSupabaseClient();

    // Fetch brand details when name not supplied by caller
    let resolvedName = brandName;
    const resolvedSlug: string | null = null;
    let resolvedDomain = domain;

    if (!resolvedName) {
      const { data: brand } = await supabase
        .from("brands")
        .select("name, domain")
        .eq("id", brandId)
        .maybeSingle();
      resolvedName = (brand?.name as string | null) ?? "";
      resolvedDomain = (brand?.domain as string | null) ?? null;
    }

    const brandHaystack: BrandHaystack = { name: resolvedName, slug: resolvedSlug, domain: resolvedDomain };

    // Quick exit: sifthub already has the specific prompts
    if (isSifthubBrand(brandHaystack) && await sifthubPromptsAlreadySeeded(brandId)) return;

    // For non-sifthub brands: skip if threshold already met
    if (!isSifthubBrand(brandHaystack) && await brandHasData(brandId)) return;

    await seedDemoDataForBrand({
      brandId,
      brandName: resolvedName,
      brandSlug: resolvedSlug,
      domain: resolvedDomain,
    });
  } catch (err) {
    logger.warn(MODULE, "ensureBrandHasDemoData failed (non-fatal)", {
      brandId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
