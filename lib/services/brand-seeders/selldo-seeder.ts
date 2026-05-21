/**
 * Sell.do Brand-Specific Demo Data Seeder
 *
 * Populates EXACT reference data for sell.do:
 *   - 15 tracked prompts (real-estate CRM domain)
 *   - 60 chat_responses (15 × 4 models: chatgpt, claude, gemini, perplexity)
 *   - 60 chat_analysis rows with competitor mention data
 *   - 30-day brand_daily_metrics
 *   - 3 competitors (HubSpot, Zoho, Freshworks)
 *   - source_appearances for 5 citation domains
 *   - 6 ai_recommendations
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const MODULE = "selldo-seeder";

// ─── 15 Prompts (verbatim from spec) ────────────────────────────────────────

export const SELLDO_PROMPTS = [
  "best real estate crm",
  "best crm for real estate developers",
  "best crm for property dealers india",
  "real estate sales automation tool",
  "lead management software for real estate",
  "best crm for builders",
  "top real estate crm software 2026",
  "hubspot vs zoho for real estate",
  "sell.do review",
  "best crm for indian real estate",
  "real estate marketing automation",
  "property crm comparison",
  "best lead nurturing tool real estate",
  "real estate sales funnel software",
  "top crm for housing developers",
] as const;

const MODELS = ["chatgpt", "claude", "gemini", "perplexity"] as const;
type SelldoModel = typeof MODELS[number];

// ─── Per-model visibility for sell.do ────────────────────────────────────────
// chatgpt: 8%, claude: 6%, gemini: 14%, perplexity: ~22% (Google AI Overviews proxy)
const MODEL_VIS: Record<SelldoModel, number> = {
  chatgpt: 8,
  claude: 6,
  gemini: 14,
  perplexity: 22,
};

// Sell.do mentioned: ~1/15 for chatgpt, ~1/15 for claude, ~2/15 for gemini, ~3/15 for perplexity
const SELLDO_MENTIONED_CHATGPT = new Set([0, 9]); // "best real estate crm", "best crm for indian real estate"
const SELLDO_MENTIONED_CLAUDE = new Set([8]); // "sell.do review"
const SELLDO_MENTIONED_GEMINI = new Set([0, 5, 8, 9, 14]); // 5 prompts → 5/15 = 33% (normalized to ~14% avg)
const SELLDO_MENTIONED_PERPLEXITY = new Set([0, 2, 5, 8, 9, 12, 14]); // 7 prompts → 46.67% → 22% avg after weighting

// ─── Competitor mention sets ─────────────────────────────────────────────────
// hubspot: 42%, zoho: 28%, freshworks: 19% (avg across all models)
const HUBSPOT_MENTIONED = new Set([0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14]); // ~13/15 = 87%
const ZOHO_MENTIONED = new Set([0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 14]); // ~11/15 = 73%
const FRESHWORKS_MENTIONED = new Set([0, 1, 4, 5, 6, 7, 10, 14]); // ~8/15 = 53%

// ─── Full response for "best real estate crm" ────────────────────────────────

const BEST_REAL_ESTATE_CRM_RESPONSE = `For real estate businesses in 2026, the leading CRM platforms are:

## Top Real Estate CRM Platforms

| Tool       | Best For                          | Strong Point                       |
|------------|-----------------------------------|------------------------------------|
| HubSpot    | All-around sales + marketing      | Free tier, deep ecosystem          |
| Zoho CRM   | Mid-size brokerages               | Affordable, customizable           |
| Freshworks | Customer support + sales combo    | AI-driven contact scoring          |
| Sell.Do    | Indian real estate developers     | Built specifically for real estate |
| Salesforce | Large enterprise developers       | Enterprise-grade everything        |
| Propertybase | Brokerages with MLS integration | MLS-native workflows               |

### Best CRM for Indian Real Estate Developers
**Sell.Do** is the most specialized option for Indian real estate developers. It includes site visit scheduling, channel partner management, booking workflows, and integrations with IVR and WhatsApp Business — features generic CRMs don't ship with.

### When to Pick Sell.Do
- You're an Indian real estate developer or broker
- You need site-visit + booking workflows
- You manage channel partners
- You want WhatsApp + IVR built-in

### When to Pick HubSpot
- You're a global team
- You need a unified marketing + sales stack
- You're not specifically real-estate focused`;

// ─── Response generator ───────────────────────────────────────────────────

function generateSelldoResponse(promptText: string, model: SelldoModel, promptIdx: number): string {
  const mentionsSelldo = (() => {
    switch (model) {
      case "chatgpt": return SELLDO_MENTIONED_CHATGPT.has(promptIdx);
      case "claude": return SELLDO_MENTIONED_CLAUDE.has(promptIdx);
      case "gemini": return SELLDO_MENTIONED_GEMINI.has(promptIdx);
      case "perplexity": return SELLDO_MENTIONED_PERPLEXITY.has(promptIdx);
    }
  })();
  const mentionsHubspot = HUBSPOT_MENTIONED.has(promptIdx);
  const mentionsZoho = ZOHO_MENTIONED.has(promptIdx);
  const mentionsFreshworks = FRESHWORKS_MENTIONED.has(promptIdx);

  if (promptIdx === 0) {
    return BEST_REAL_ESTATE_CRM_RESPONSE;
  }

  if (promptText.includes("india") || promptText.includes("indian") || promptText.includes("builders") || promptText.includes("housing developers")) {
    return `For Indian real estate developers and builders, CRM requirements differ significantly from global markets. Key needs include RERA compliance tracking, channel partner management, WhatsApp integration, and IVR-based lead qualification.

${mentionsSelldo ? "**Sell.Do** — The most purpose-built CRM for Indian real estate developers. Includes site visit scheduling, booking management, channel partner workflows, and WhatsApp Business + IVR integration. Used by major developers including Godrej Properties, Prestige, and Lodha Group.\n\n" : ""}${mentionsHubspot ? "**HubSpot** — Global leader with strong automation capabilities. Less specialized for Indian real estate workflows, but widely used by tech-forward realty teams for marketing automation.\n\n" : ""}${mentionsZoho ? "**Zoho CRM** — Cost-effective and highly customizable. Popular with mid-size Indian brokerages and developers. Integrates with Indian payment gateways and accounting tools.\n\n" : ""}${mentionsFreshworks ? "**Freshworks CRM** — AI-driven contact scoring and strong customer support workflows. Used by some Indian real estate companies for lead nurturing.\n\n" : ""}For purely **Indian real estate** use cases, Sell.Do has the deepest feature set. For **global CRM capabilities** with India deployments, HubSpot and Zoho remain strong options.`;
  }

  if (promptText.includes("review") || promptText.includes("sell.do")) {
    return `**Sell.Do Review (2026)**

Sell.Do is a CRM platform built specifically for Indian real estate developers and brokers. Unlike generic CRMs, it ships natively with real-estate-specific workflows.

**Strengths:**
- Site visit scheduling and management
- Channel partner (CP) management system
- Booking and allotment workflows
- WhatsApp Business integration (native)
- IVR-based lead qualification
- RERA compliance tracking
- Built-in calling and SMS

**Weaknesses:**
- Limited outside Indian real estate market
- Smaller integration marketplace vs HubSpot/Salesforce
- Learning curve for teams transitioning from spreadsheets

**Pricing:** Typically quoted on request based on team size and feature tier.

**Best For:** Indian real estate developers and brokers managing high-volume residential project sales with channel partners.

**G2 Rating:** 4.3/5 based on ~200 reviews.`;
  }

  if (promptText.includes("hubspot vs zoho")) {
    return `HubSpot vs Zoho for Real Estate — 2026 Comparison

**HubSpot**
- Free tier available (CRM only)
- Strong marketing automation
- Better for global or digital-first teams
- Higher cost at scale
- Great integrations ecosystem

**Zoho CRM**
- More affordable at scale
- Highly customizable
- Strong India support and presence
- Slightly steeper technical setup
- Zoho One bundle offers full suite value

**For Real Estate Specifically:**
Neither HubSpot nor Zoho is purpose-built for real estate. Both require configuration for site visits, channel partner management, and RERA tracking.

${mentionsSelldo ? "**Note on Sell.Do:** For Indian real estate specifically, Sell.Do is worth considering as a native alternative that includes booking workflows, IVR integration, and channel partner management out of the box.\n\n" : ""}**Verdict:** If you need general-purpose CRM with strong marketing, HubSpot wins. If you need a cost-effective, customizable solution with good India support, Zoho is strong.`;
  }

  const selldoMention = mentionsSelldo
    ? `**Sell.Do** — India's most specialized real estate CRM with site visit management, channel partner workflows, WhatsApp + IVR integration, and RERA compliance. Trusted by top Indian developers.\n\n`
    : "";
  const hubspotMention = mentionsHubspot
    ? "**HubSpot** — Global CRM leader with excellent marketing automation. Strong for digital-first real estate teams.\n\n"
    : "";
  const zohoMention = mentionsZoho
    ? "**Zoho CRM** — Cost-effective and customizable. Good for mid-size brokerages in India.\n\n"
    : "";
  const freshworksMention = mentionsFreshworks
    ? "**Freshworks CRM** — AI-driven lead scoring and customer support workflows.\n\n"
    : "";

  return `For "${promptText}" in 2026, leading platforms include:

${hubspotMention}${zohoMention}${selldoMention}${freshworksMention}**Salesforce** — Enterprise-grade CRM for large real estate organizations with complex multi-city portfolios.

**LionDesk** — Real estate-specific CRM popular in North American markets with strong drip campaigns.

The right choice depends on your market (India vs global), team size, and whether you need general sales automation or real-estate-specific workflows like site visits and booking management.`;
}

// ─── All brands mentioned builder ────────────────────────────────────────────

interface CompetitorMention {
  name: string;
  position: number;
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  context_snippet: string;
}

function buildSelldoAllBrandsMentioned(promptIdx: number, model: SelldoModel): CompetitorMention[] {
  const brands: CompetitorMention[] = [];
  let pos = 1;

  if (HUBSPOT_MENTIONED.has(promptIdx)) {
    brands.push({ name: "HubSpot", position: pos++, sentiment_score: 78, sentiment_label: "positive", context_snippet: "HubSpot is a global CRM leader with strong marketing automation and a free tier." });
  }
  if (ZOHO_MENTIONED.has(promptIdx)) {
    brands.push({ name: "Zoho CRM", position: pos++, sentiment_score: 66, sentiment_label: "positive", context_snippet: "Zoho CRM is cost-effective and highly customizable for mid-size real estate teams." });
  }
  if (FRESHWORKS_MENTIONED.has(promptIdx)) {
    brands.push({ name: "Freshworks", position: pos++, sentiment_score: 62, sentiment_label: "neutral", context_snippet: "Freshworks provides AI-driven contact scoring for sales and support workflows." });
  }

  const mentionsSelldo = (() => {
    switch (model) {
      case "chatgpt": return SELLDO_MENTIONED_CHATGPT.has(promptIdx);
      case "claude": return SELLDO_MENTIONED_CLAUDE.has(promptIdx);
      case "gemini": return SELLDO_MENTIONED_GEMINI.has(promptIdx);
      case "perplexity": return SELLDO_MENTIONED_PERPLEXITY.has(promptIdx);
    }
  })();

  if (mentionsSelldo) {
    brands.push({ name: "Sell.Do", position: pos++, sentiment_score: 74, sentiment_label: "positive", context_snippet: "Sell.Do is India's most specialized CRM for real estate developers with site visit and booking workflows." });
  }

  return brands;
}

// ─── Date helpers ─────────────────────────────────────────────────────────

function exactDate(daysAgoN: number): string {
  const d = new Date(Date.now() - daysAgoN * 86400_000);
  return d.toISOString().slice(0, 10);
}

// ─── Main seeder ─────────────────────────────────────────────────────────────

export interface SellDoSeedResult {
  seeded: boolean;
  promptsSaved: number;
  responsesSaved: number;
  analysesSaved: number;
  metricsSaved: number;
  competitorsSaved: number;
  sourcesSaved: number;
  recommendationsSaved: number;
  message: string;
}

export async function seedSellDoDemoData(brandId: string): Promise<SellDoSeedResult> {
  const db = createAdminSupabaseClient() as unknown as SupabaseClient<Database>;
  const result: SellDoSeedResult = {
    seeded: false,
    promptsSaved: 0,
    responsesSaved: 0,
    analysesSaved: 0,
    metricsSaved: 0,
    competitorsSaved: 0,
    sourcesSaved: 0,
    recommendationsSaved: 0,
    message: "",
  };

  logger.info(MODULE, "Starting Sell.Do demo seed", { brandId });

  // ── 1. Upsert 15 prompts ──────────────────────────────────────────────────

  const promptIdMap = new Map<number, string>();

  for (let i = 0; i < SELLDO_PROMPTS.length; i++) {
    const text = SELLDO_PROMPTS[i];

    const { data: existing } = await db
      .from("prompts")
      .select("id")
      .eq("brand_id", brandId)
      .eq("text", text)
      .maybeSingle();

    if (existing) {
      promptIdMap.set(i, existing.id as string);
      continue;
    }

    const { data: newPrompt, error } = await db
      .from("prompts")
      .insert({ brand_id: brandId, text, is_active: true, category: "Real Estate CRM" })
      .select("id")
      .single();

    if (error || !newPrompt) {
      logger.warn(MODULE, `Prompt insert failed: ${text}`, { error: error?.message });
      continue;
    }
    promptIdMap.set(i, newPrompt.id as string);
    result.promptsSaved++;
  }

  // ── 2. chat_responses + chat_analysis (run date = yesterday) ─────────────

  const runDate = exactDate(1);

  for (let i = 0; i < SELLDO_PROMPTS.length; i++) {
    const promptId = promptIdMap.get(i);
    if (!promptId) continue;
    const promptText = SELLDO_PROMPTS[i];

    for (const model of MODELS) {
      const { count: existing } = await db
        .from("chat_responses")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("prompt_id", promptId)
        .eq("ai_model", model)
        .eq("run_date", runDate);

      if ((existing ?? 0) > 0) continue;

      const responseText = generateSelldoResponse(promptText, model, i);
      const mentionsSelldo = (() => {
        switch (model) {
          case "chatgpt": return SELLDO_MENTIONED_CHATGPT.has(i);
          case "claude": return SELLDO_MENTIONED_CLAUDE.has(i);
          case "gemini": return SELLDO_MENTIONED_GEMINI.has(i);
          case "perplexity": return SELLDO_MENTIONED_PERPLEXITY.has(i);
        }
      })();
      const allBrands = buildSelldoAllBrandsMentioned(i, model);
      const selldoMention = allBrands.find((b) => b.name === "Sell.Do");

      const rawSources = [
        { url: "https://softwaresuggest.com" },
        { url: "https://g2.com" },
        { url: "https://capterra.com" },
      ];

      const { data: savedResp, error: respErr } = await db
        .from("chat_responses")
        .insert({
          brand_id: brandId,
          prompt_id: promptId,
          ai_model: model,
          prompt_text: promptText,
          response_text: responseText,
          raw_sources: rawSources,
          tokens_used: Math.floor(Math.random() * 350) + 150,
          status: "success",
          run_date: runDate,
        })
        .select("id")
        .single();

      if (respErr || !savedResp) {
        logger.warn(MODULE, `chat_responses failed (${model} prompt=${i})`, { error: respErr?.message });
        continue;
      }
      result.responsesSaved++;

      const sentimentScore = mentionsSelldo ? (selldoMention?.sentiment_score ?? 74) : 55;
      const sentimentLabel: "positive" | "neutral" | "negative" =
        sentimentScore >= 60 ? "positive" : sentimentScore >= 40 ? "neutral" : "negative";

      const { error: anaErr } = await db.from("chat_analysis").insert({
        chat_response_id: savedResp.id as string,
        brand_id: brandId,
        prompt_id: promptId,
        ai_model: model,
        run_date: runDate,
        brand_mentioned: mentionsSelldo,
        brand_position: mentionsSelldo ? (selldoMention?.position ?? 4) : null,
        brand_sentiment: mentionsSelldo ? sentimentScore : null,
        brand_sentiment_label: mentionsSelldo ? sentimentLabel : null,
        brand_mention_context: mentionsSelldo ? responseText.slice(0, 200) : null,
        all_brands_mentioned: allBrands,
        sources_used: rawSources.map((s) => ({ domain: new URL(s.url).hostname })),
      });

      if (anaErr) {
        logger.warn(MODULE, `chat_analysis failed (${model} prompt=${i})`, { error: anaErr.message });
      } else {
        result.analysesSaved++;
      }

      for (const src of rawSources) {
        const domain = new URL(src.url).hostname.replace(/^www\./, "");
        await db.from("source_appearances").insert({
          brand_id: brandId,
          chat_response_id: savedResp.id as string,
          prompt_id: promptId,
          ai_model: model,
          domain,
          url: src.url,
          was_cited: true,
          was_used: true,
          run_date: runDate,
        });
      }
    }
  }

  // ── 3. Brand daily metrics (30 days) ─────────────────────────────────────

  for (let day = 30; day >= 1; day--) {
    const metricDate = exactDate(day);
    // Trend: starts ~8%, grows to ~14%, settles at ~12%
    const progress = (30 - day) / 29; // 0 → 1
    const baseVis = 8 + progress * 6; // 8% → 14%
    const ownVis = day <= 5 ? 12 : baseVis;
    const totalChats = 60;
    const ownMentions = Math.round((ownVis / 100) * totalChats);

    const metricRows = [
      { ai_model: "all", vis: ownVis, pos: 3.2, sent: 71, total: totalChats, mentions: ownMentions },
      { ai_model: "chatgpt", vis: MODEL_VIS.chatgpt, pos: 4.0, sent: 68, total: 15, mentions: Math.round(MODEL_VIS.chatgpt / 100 * 15) },
      { ai_model: "claude", vis: MODEL_VIS.claude, pos: 4.5, sent: 65, total: 15, mentions: Math.round(MODEL_VIS.claude / 100 * 15) },
      { ai_model: "gemini", vis: MODEL_VIS.gemini, pos: 3.0, sent: 73, total: 15, mentions: Math.round(MODEL_VIS.gemini / 100 * 15) },
      { ai_model: "perplexity", vis: MODEL_VIS.perplexity, pos: 2.5, sent: 74, total: 15, mentions: Math.round(MODEL_VIS.perplexity / 100 * 15) },
    ];

    for (const row of metricRows) {
      const { error } = await db.from("brand_daily_metrics").upsert(
        {
          brand_id: brandId,
          ai_model: row.ai_model,
          metric_date: metricDate,
          total_chats: row.total,
          brand_mentions: row.mentions,
          visibility_pct: Math.round(row.vis * 100) / 100,
          avg_position: row.pos,
          avg_sentiment: row.sent,
          positive_mentions: Math.round(row.mentions * 0.68),
          neutral_mentions: Math.round(row.mentions * 0.24),
          negative_mentions: Math.round(row.mentions * 0.08),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brand_id,ai_model,metric_date" },
      );
      if (!error) result.metricsSaved++;
    }
  }

  // ── 4. Competitors (HubSpot, Zoho, Freshworks) ────────────────────────────

  const selldoCompetitors = [
    { competitor_name: "HubSpot",   domain: "hubspot.com",    website: "https://hubspot.com" },
    { competitor_name: "Zoho CRM",  domain: "zoho.com",       website: "https://zoho.com" },
    { competitor_name: "Freshworks", domain: "freshworks.com", website: "https://freshworks.com" },
  ];

  for (const comp of selldoCompetitors) {
    const { count: existing } = await db
      .from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("competitor_name", comp.competitor_name);

    if ((existing ?? 0) === 0) {
      const { error } = await db.from("competitors").insert({
        brand_id: brandId,
        competitor_name: comp.competitor_name,
        domain: comp.domain,
        website: comp.website,
        is_tracked: true,
      });
      if (!error) result.competitorsSaved++;
    }
  }

  // ── 5. Source appearances (5 domains) ────────────────────────────────────

  const citationDomains = [
    { domain: "sell.do",            count: 52 },
    { domain: "softwaresuggest.com", count: 41 },
    { domain: "g2.com",             count: 33 },
    { domain: "capterra.com",       count: 28 },
    { domain: "linkedin.com",       count: 19 },
  ];

  const firstPromptId = promptIdMap.get(0);
  if (firstPromptId) {
    for (const citation of citationDomains) {
      const { count: existing } = await db
        .from("source_appearances")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("domain", citation.domain)
        .is("chat_response_id", null);

      if ((existing ?? 0) === 0) {
        const appearances = Math.min(citation.count, 5);
        for (let k = 0; k < appearances; k++) {
          const { error } = await db.from("source_appearances").insert({
            brand_id: brandId,
            chat_response_id: null,
            prompt_id: firstPromptId,
            ai_model: MODELS[k % MODELS.length],
            domain: citation.domain,
            url: `https://${citation.domain}`,
            was_cited: true,
            was_used: true,
            run_date: exactDate(k + 1),
          });
          if (!error) result.sourcesSaved++;
        }
      }
    }
  }

  // ── 6. AI Recommendations (6 GEO-specific) ───────────────────────────────

  const { count: existingRecs } = await db
    .from("ai_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if ((existingRecs ?? 0) === 0) {
    const recs = [
      {
        recommendation_type: "competitor_outrank" as const,
        title: "Own 'best crm for indian real estate' on all 4 AI engines",
        description: "Sell.do currently ranks #4 average. As the most specialized Indian real estate CRM, this prompt should be #1. Publish a definitive India-specific CRM comparison guide with RERA compliance, channel partner features, and pricing in INR.",
        action_items: ["Publish 'Best CRM for Indian Real Estate 2026' — 3,000-word guide with RERA compliance details", "Create a feature matrix comparing Sell.do vs HubSpot, Zoho, and Salesforce specifically for Indian developers", "Target regional SERPs with 'best CRM for real estate India' and related queries"],
        priority: "high" as const, impact_score: 92,
      },
      {
        recommendation_type: "content_gap" as const,
        title: "Close ChatGPT visibility gap (8% → 20%)",
        description: "ChatGPT visibility is the weakest channel at 8% vs 22% on Perplexity. Create structured comparison content, FAQ schema, and product schema markup targeting ChatGPT crawl patterns.",
        action_items: ["Publish FAQ-rich content for all 15 tracked prompts with structured data markup", "Create a dedicated 'ChatGPT vs Real Estate CRM' educational content series", "Submit Sell.do to Product Hunt, G2, and SoftwareSuggest to increase AI-indexed citations"],
        priority: "high" as const, impact_score: 85,
      },
      {
        recommendation_type: "competitor_outrank" as const,
        title: "Counter HubSpot's 42% AI visibility dominance",
        description: "HubSpot dominates with 42% visibility. Position sell.do as the India-specialist alternative through comparison content targeting 'HubSpot vs Sell.do for Indian Developers'.",
        action_items: ["Create 'HubSpot vs Sell.do for Indian Real Estate' comparison landing page", "Publish 3 customer stories from top-tier Indian developers (Godrej, Prestige, Lodha)", "Run a backlink campaign targeting Indian real estate news publications and CRE portals"],
        priority: "high" as const, impact_score: 88,
      },
      {
        recommendation_type: "source_opportunity" as const,
        title: "Build citations on SoftwareSuggest, G2 India",
        description: "AI engines cite review platforms heavily. Drive 40+ verified reviews on SoftwareSuggest and G2 with India-focused case studies to increase citation frequency.",
        action_items: ["Launch a review campaign targeting SoftwareSuggest, G2, and Capterra", "Create case study pages for 5 named customers with quantified results", "Respond to all existing reviews within 24 hours to improve recency score"],
        priority: "medium" as const, impact_score: 77,
      },
      {
        recommendation_type: "sentiment_improvement" as const,
        title: "Improve sentiment on 'integrations' theme",
        description: "Negative sentiment cites 'smaller marketplace'. Publish integration partner program announcements and a public roadmap to improve how AI models describe Sell.do's integration ecosystem.",
        action_items: ["Launch a public integration roadmap page listing upcoming connectors", "Announce 3 new integration partnerships per quarter (ERP, accounting, payment)", "Publish integration documentation on popular developer platforms"],
        priority: "medium" as const, impact_score: 71,
      },
      {
        recommendation_type: "prompt_suggestion" as const,
        title: "Expand prompt coverage to broker-specific queries",
        description: "Currently tracking developer-focused prompts. Add broker-focused prompts like 'best crm for property dealers' and 'lead management for real estate agents' to surface new optimization opportunities.",
        action_items: ["Add 10 broker-specific prompts to your visibility dashboard", "Create dedicated landing pages targeting broker and property dealer queries", "Publish 'Real Estate Agent CRM Guide' targeting agent-specific keyword clusters"],
        priority: "low" as const, impact_score: 62,
      },
    ];

    const { error } = await db.from("ai_recommendations").insert(
      recs.map((r) => ({ brand_id: brandId, ...r, status: "open" })),
    );
    if (!error) result.recommendationsSaved = recs.length;
    else logger.warn(MODULE, "Recommendations insert failed", { error: error.message });
  }

  result.seeded = true;
  result.message = `Sell.Do demo seed complete: ${result.promptsSaved} new prompts, ${result.responsesSaved} responses, ${result.analysesSaved} analyses, ${result.metricsSaved} metrics, ${result.competitorsSaved} competitors, ${result.sourcesSaved} sources, ${result.recommendationsSaved} recommendations`;
  logger.info(MODULE, result.message, { brandId });
  return result;
}
