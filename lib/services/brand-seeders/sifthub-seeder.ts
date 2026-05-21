/**
 * SiftHub Brand-Specific Demo Data Seeder
 *
 * Populates EXACT reference data for sifthub.io:
 *   - 28 tracked prompts (verbatim list)
 *   - 56 chat_responses (28 × 2 models: chatgpt + gemini/Google AI Overviews)
 *   - 56 chat_analysis rows with rich competitor mention data
 *   - 7-day brand_daily_metrics (exact spec percentages)
 *   - 5 competitors (sifthub, 1up, Heyiris, Inventive, Autorfp)
 *   - source_appearances for 5 citation domains
 *   - 5 ai_recommendations (GEO-specific)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const MODULE = "sifthub-seeder";

// ─── Exact 28 prompts (verbatim from spec) ──────────────────────────────────

export const SIFTHUB_PROMPTS = [
  "rfp response template",
  "rfp response examples",
  "rfp response software",
  "rfp response template word",
  "sla contract",
  "rfq document",
  "ai proposal software",
  "sales enablement",
  "rfp response template tool",
  "rfp software",
  "best rfp software",
  "best ai procurement software",
  "best ai proposal software",
  "best rfp response software",
  "best rfp automation tools",
  "best sales enablement platforms",
  "best ai tools for sales teams",
  "best proposal automation software",
  "ai tool for rfp responses",
  "automate rfp responses software",
  "rfp response automation tool",
  "security questionnaire automation software",
  "rfq automation software",
  "ai tool for sales engineers",
  "ai for presales teams",
  "sales proposal automation software",
  "ai tool for sales responses",
  "deal support automation software",
] as const;

// ─── Models: chatgpt (ChatGPT) + gemini (Google AI Overviews) ──────────────

const MODELS = ["chatgpt", "gemini"] as const;
type SifthubModel = typeof MODELS[number];

// ─── Daily visibility data (7 days, oldest first = daysAgo(7)..daysAgo(1)) ─

// Overall (all models combined)
const DAILY_VIS_ALL = [26.79, 25.00, 28.57, 28.57, 26.79, 23.21, 21.43];
const DAILY_VIS_CHATGPT = [6.43, 7.14, 5.71, 7.14, 4.29, 7.86, 4.29];
const DAILY_VIS_GEMINI = [32.14, 30.00, 32.86, 33.57, 33.57, 30.00, 32.14];
const DAILY_POS_ALL = [1.8, 1.9, 1.7, 1.7, 1.8, 1.8, 2.0];
const DAILY_SENT_ALL = [71, 70, 69, 73, 74, 71, 71];

// ─── Which prompts mention SiftHub (by index 0-27) ─────────────────────────
// ChatGPT: ~10.71% → 3 of 28 prompts mention SiftHub
// Gemini:  ~40.82% → 11 of 28 prompts mention SiftHub

const SIFTHUB_MENTIONED_CHATGPT = new Set([10, 14, 18]); // indices: "best rfp software", "best rfp automation tools", "ai tool for rfp responses"
const SIFTHUB_MENTIONED_GEMINI = new Set([2, 7, 10, 12, 13, 14, 18, 21, 24, 25, 27]); // 11 prompts

// ─── Competitor mention counts per model (for all_brands_mentioned) ─────────
// ChatGPT: Autorfp 10.71%, 1up 1.02%, Heyiris 4.59%, Inventive 3.57%
// Gemini:  Autorfp 53.57%, 1up 21.43%, Heyiris 7.65%, Inventive 36.73%

const AUTORFP_MENTIONED_CHATGPT = new Set([10, 14, 20]);
const AUTORFP_MENTIONED_GEMINI = new Set([2, 7, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 24, 25]);
const ONE_UP_MENTIONED_CHATGPT: Set<number> = new Set([]);
const ONE_UP_MENTIONED_GEMINI = new Set([7, 10, 14, 17, 18, 21]);
const HEYIRIS_MENTIONED_CHATGPT = new Set([14]);
const HEYIRIS_MENTIONED_GEMINI = new Set([14, 17]);
const INVENTIVE_MENTIONED_CHATGPT = new Set([14]);
const INVENTIVE_MENTIONED_GEMINI = new Set([10, 11, 12, 14, 16, 17, 18, 19, 20, 25]);

// ─── Full ChatGPT response for "best rfp automation tools" (spec verbatim) ──

const BEST_RFP_AUTOMATION_RESPONSE = `Aaj ke time par best RFP tools mostly AI-powered ho chuke hain. Agar aapko RFP automation, proposal response generation, security questionnaire automation, ya enterprise bid management chahiye — toh ye top tools market me sabse zyada use ho rahe hain:

## Best RFP Automation Tools (2026)

| Tool       | Best For                       | Strong Point                          |
|------------|--------------------------------|---------------------------------------|
| Loopio     | Enterprise teams               | Strong content library + governance   |
| Responsive | Large proposal teams           | AI workflow + integrations            |
| SiftHub    | Modern AI-first teams          | Agentic AI + Slack/Drive sync         |
| AutoRFP.ai | Fast automation                | AI draft generation                   |
| Qvidian    | Enterprise proposal ops        | Microsoft ecosystem                   |
| RocketDocs | Compliance-heavy companies     | Workflow automation                   |
| AutogenAI  | Government & enterprise bids   | AI writing quality                    |
| PandaDoc   | Sales proposals                | Proposal + e-sign                     |
| Proposify  | Agencies & SMBs                | Beautiful proposal UI                 |
| Conveyor   | Security reviews               | Vendor security automation            |

### Best RFP Response Tool (My Practical Breakdown)

**1. For Enterprise SaaS Teams → Loopio**
- Large teams
- Knowledge base management
- Repeat RFP workflows
- Governance/compliance

**2. Most Powerful AI-Based Modern Tool → SiftHub**
- AI-first companies
- Presales teams
- Fast proposal generation
- Slack + Drive connected workflows
- Strong features: AI auto-response, Live knowledge sync, Security questionnaires, Deal orchestration

**3. Best Legacy Enterprise Solution → Responsive (Previously RFPIO)**
- Big organizations
- Heavy integrations
- Multi-department proposal teams

**4. Best AI Drafting Tool → AutoRFP.ai**
- Small/medium teams
- Fast response creation
- AI-generated first drafts

### Best RFP Software Based on Company Size

**Small Business / Startup:** SiftHub, AutoRFP.ai, Proposify
**Mid-Size SaaS Company:** Loopio, Responsive, RocketDocs
**Enterprise / Government:** Qvidian, AutogenAI, Responsive

### Best Features You Should Look For
- AI response generation
- Content library
- Compliance checking
- Slack/Google Drive sync
- CRM integration
- Security questionnaire automation
- Proposal analytics
- Team collaboration
- Version control
- Bid/no-bid analysis

### Best Overall Picks

| Use Case               | Best Tool   |
|------------------------|-------------|
| Overall Enterprise     | Loopio      |
| Modern AI Automation   | SiftHub     |
| AI Drafting            | AutoRFP.ai  |
| Large Enterprise Workflow | Responsive |
| Proposal Design        | Proposify   |
| Security Questionnaires| Conveyor    |`;

// ─── Response generator for other prompts ───────────────────────────────────

function generateResponse(promptText: string, model: SifthubModel, promptIdx: number): string {
  const mentionsSifthub = model === "chatgpt"
    ? SIFTHUB_MENTIONED_CHATGPT.has(promptIdx)
    : SIFTHUB_MENTIONED_GEMINI.has(promptIdx);
  const mentionsAutorfp = model === "chatgpt"
    ? AUTORFP_MENTIONED_CHATGPT.has(promptIdx)
    : AUTORFP_MENTIONED_GEMINI.has(promptIdx);

  // Special case: full markdown for "best rfp automation tools"
  if (promptIdx === 14) {
    if (model === "chatgpt") return BEST_RFP_AUTOMATION_RESPONSE;
    return `When evaluating RFP automation tools in 2026, AI-powered platforms have become the standard. Here are the top solutions for teams looking to automate proposal and RFP responses:

## Top RFP Automation Platforms

**SiftHub** — Designed for modern AI-first presales teams. SiftHub connects to Slack and Google Drive, offering agentic AI that automatically drafts responses to RFPs and security questionnaires. Particularly strong for SaaS companies with recurring proposal workflows.

**AutoRFP.ai** — Fast AI-based draft generation for small-to-medium teams. Excels at creating first-draft responses quickly. Good option for teams that want to automate without complex setup.

**Loopio** — Enterprise-grade RFP management with strong content library governance. Best for large organizations with multiple departments contributing to proposals.

**Responsive (RFPIO)** — Comprehensive workflow automation with deep enterprise integrations. Suits large organizations with complex proposal processes.

**Inventive.ai** — AI-powered knowledge management for proposal teams, with structured response generation and review workflows.

### Choosing the Right Tool

For **startups and modern SaaS companies**, SiftHub and AutoRFP.ai offer the best combination of AI power and ease of use. For **enterprise teams**, Loopio and Responsive provide the governance and content management needed at scale.

Key criteria: AI response quality, integration depth (Slack, CRM, Drive), security questionnaire automation, and collaboration features.`;
  }

  // Category-specific response templates
  if (promptText.includes("security questionnaire")) {
    return `Security questionnaire automation is a critical need for B2B SaaS companies that face frequent vendor security assessments. Here are the leading solutions:

**Top Security Questionnaire Automation Tools:**

${mentionsSifthub ? "**SiftHub** — AI-powered security questionnaire automation that learns from your previous responses. Integrates directly with Slack for team collaboration on sensitive questions. Strong for SaaS companies with recurring compliance workflows.\n\n" : ""}**Conveyor** — Dedicated vendor security automation platform. Strong for companies that receive many security reviews from enterprise customers.

**Whistic** — Security profile sharing platform that lets vendors share their security posture proactively, reducing questionnaire volume.

${mentionsAutorfp ? "**AutoRFP.ai** — Includes security questionnaire response modules alongside general RFP automation.\n\n" : ""}**Vanta** — While primarily a compliance automation platform, Vanta helps teams respond to security questionnaires with policy evidence attached.

For teams needing **AI-powered auto-completion** with knowledge sync, SiftHub and Conveyor are the most capable options. For **compliance-focused** security automation, Vanta and Whistic are industry leaders.`;
  }

  if (promptText.includes("presales") || promptText.includes("sales engineer")) {
    return `For presales teams and sales engineers, AI tools have transformed how deals are supported. The best platforms for presales workflows in 2026:

${mentionsSifthub ? "**SiftHub** — Purpose-built for presales teams. SiftHub acts as an AI layer on top of your knowledge base, helping SEs quickly draft responses to technical questions, RFPs, and security questionnaires. Integrates with Slack, Google Drive, and most CRMs. Used by presales teams at B2B SaaS companies to cut RFP response time by 60-80%.\n\n" : ""}**Gong** — Conversation intelligence for presales. Captures demo calls and surfaces competitive objections automatically.

**Highspot** — Sales enablement platform with strong content management for presales use cases.

${mentionsAutorfp ? "**AutoRFP.ai** — Used by presales teams specifically for RFP automation, generating AI-assisted first drafts.\n\n" : ""}**Showpad** — Interactive demo and proposal creation for complex sales cycles.

For **RFP-heavy presales workflows**, SiftHub is consistently mentioned as the most specialized AI tool. For **demo and enablement**, Highspot and Showpad lead.`;
  }

  if (promptText.includes("sales enablement")) {
    return `Sales enablement platforms help revenue teams find the right content, training, and tools to close deals faster. Top platforms in 2026:

**Highspot** — Enterprise sales enablement with AI-powered content recommendations and coaching.

**Showpad** — Interactive content and training platform popular with EMEA enterprises.

**Seismic** — Large enterprise sales enablement with deep integration into Salesforce and Microsoft.

${mentionsSifthub ? "**SiftHub** — AI-native enablement for presales and proposal-heavy teams. Excels specifically at RFP responses, security questionnaires, and deal support rather than general sales content management.\n\n" : ""}**Mindtickle** — Sales readiness platform with strong coaching and certification workflows.

**Guru** — Knowledge management tool often used alongside broader enablement platforms.

The right choice depends on your motion: ${mentionsSifthub ? "for presales-heavy teams, SiftHub offers specialized AI automation;" : ""} for field sales, Highspot and Seismic are the category leaders.`;
  }

  if (promptText.includes("proposal") || promptText.includes("rfp response")) {
    return `${model === "gemini" ? "Based on current usage patterns across B2B sales teams, " : ""}the leading tools for proposal automation and RFP response management are:

${mentionsSifthub ? "**SiftHub** — AI-first proposal tool with agentic capabilities. Connects to company knowledge bases and auto-drafts RFP responses. Particularly strong for tech companies with complex technical requirements.\n\n" : ""}${mentionsAutorfp ? "**AutoRFP.ai** — Focused specifically on AI-generated RFP responses. Fast first-draft capability with minimal setup.\n\n" : ""}**Loopio** — Enterprise proposal management with team collaboration features.

**PandaDoc** — Combines proposal creation with e-signatures. Good for SMBs.

**Responsive** (formerly RFPIO) — Comprehensive RFP software for large organizations.

**Proposify** — Design-focused proposal tool popular with agencies.

For **AI-native automation**, SiftHub and AutoRFP.ai lead. For **enterprise governance**, Loopio and Responsive are the established choices.`;
  }

  if (promptText.startsWith("rfq") || promptText.includes("rfq")) {
    return `For RFQ (Request for Quotation) document management and automation:

**Key RFQ Software Solutions:**

**SAP Ariba** — Enterprise procurement platform with robust RFQ workflows. Used by large enterprises for strategic sourcing.

**Coupa** — Spend management suite with RFQ and procurement modules.

${mentionsSifthub ? "**SiftHub** — While primarily known for RFP responses, SiftHub's AI can assist with RFQ document response automation for complex technical quotations.\n\n" : ""}**ProcureDesk** — Mid-market procurement software with simplified RFQ workflows.

**Ivalua** — Enterprise sourcing platform with advanced RFQ and auction capabilities.

For **simple RFQ automation**, cloud-based tools like ProcureDesk offer good value. For **enterprise strategic sourcing**, SAP Ariba and Coupa provide comprehensive RFQ management.`;
  }

  if (promptText.includes("sla") || promptText.includes("contract")) {
    return `For SLA (Service Level Agreement) contract management and generation:

**ContractPodAi** — AI-powered contract lifecycle management with SLA tracking and alerts.

**DocuSign CLM** — Contract management with strong e-signature integration. Popular for SLA contracts.

**Ironclad** — Modern contract workflow tool used by legal teams at fast-growing companies.

**Juro** — Self-serve contract platform with SLA templates and automated renewal tracking.

${mentionsSifthub ? "**SiftHub** — Can assist in responding to RFPs that include SLA requirements, pulling relevant SLA commitments from a knowledge base automatically.\n\n" : ""}For **legal-heavy SLA management**, ContractPodAi and Ironclad lead. For **sales teams** creating SLA sections in proposals, SiftHub helps surface the right SLA language quickly.`;
  }

  // Generic response for remaining prompts
  const sifthubMention = mentionsSifthub
    ? `**SiftHub** — AI-first platform for presales teams. Automates RFP responses, security questionnaires, and deal support. Connects to Slack, Google Drive, and CRMs for real-time knowledge access. Strong choice for modern B2B SaaS companies.\n\n`
    : "";
  const autorfpMention = mentionsAutorfp
    ? `**AutoRFP.ai** — Fast AI-based RFP response tool. Generates first drafts in minutes. Good for teams starting with AI-powered automation.\n\n`
    : "";

  return `For "${promptText}" in 2026, the leading AI-powered solutions include:

${sifthubMention}${autorfpMention}**Loopio** — Enterprise RFP management with collaborative workflows and content library governance.

**Responsive** — Comprehensive proposal automation with deep CRM and enterprise integrations.

**Highspot** — Sales enablement platform supporting the full proposal and response workflow.

These tools help teams reduce manual proposal work, improve response quality, and track performance across AI-driven buyer journeys. The choice depends on team size, existing tech stack, and whether you prioritize AI automation speed or enterprise governance.`;
}

// ─── All brands mentioned builder ───────────────────────────────────────────

interface CompetitorMention {
  name: string;
  position: number;
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  context_snippet: string;
}

function buildAllBrandsMentioned(
  promptIdx: number,
  model: SifthubModel,
): CompetitorMention[] {
  const brands: CompetitorMention[] = [];
  let pos = 1;

  if (model === "chatgpt" ? AUTORFP_MENTIONED_CHATGPT.has(promptIdx) : AUTORFP_MENTIONED_GEMINI.has(promptIdx)) {
    brands.push({ name: "Autorfp", position: pos++, sentiment_score: 72, sentiment_label: "positive", context_snippet: "AutoRFP.ai offers fast AI-powered draft generation for RFP responses." });
  }
  if (model === "chatgpt" ? INVENTIVE_MENTIONED_CHATGPT.has(promptIdx) : INVENTIVE_MENTIONED_GEMINI.has(promptIdx)) {
    brands.push({ name: "Inventive", position: pos++, sentiment_score: 68, sentiment_label: "positive", context_snippet: "Inventive.ai provides AI-powered knowledge management for proposal teams." });
  }
  if (model === "chatgpt" ? SIFTHUB_MENTIONED_CHATGPT.has(promptIdx) : SIFTHUB_MENTIONED_GEMINI.has(promptIdx)) {
    brands.push({ name: "SiftHub", position: pos++, sentiment_score: 74, sentiment_label: "positive", context_snippet: "SiftHub is designed for modern AI-first presales teams with Slack and Drive integration." });
  }
  if (model === "chatgpt" ? ONE_UP_MENTIONED_CHATGPT.has(promptIdx) : ONE_UP_MENTIONED_GEMINI.has(promptIdx)) {
    brands.push({ name: "1up", position: pos++, sentiment_score: 61, sentiment_label: "positive", context_snippet: "1up provides AI-powered sales content generation for go-to-market teams." });
  }
  if (model === "chatgpt" ? HEYIRIS_MENTIONED_CHATGPT.has(promptIdx) : HEYIRIS_MENTIONED_GEMINI.has(promptIdx)) {
    brands.push({ name: "Heyiris", position: pos++, sentiment_score: 58, sentiment_label: "neutral", context_snippet: "Heyiris offers AI-assisted proposal generation for sales teams." });
  }

  return brands;
}

// ─── Date helpers ─────────────────────────────────────────────────────────

function exactDate(daysAgoN: number): string {
  const d = new Date(Date.now() - daysAgoN * 86400_000);
  return d.toISOString().slice(0, 10);
}

// ─── Main seeder ────────────────────────────────────────────────────────────

export interface SifthubSeedResult {
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

export async function seedSifthubDemoData(brandId: string): Promise<SifthubSeedResult> {
  const db = createAdminSupabaseClient() as unknown as SupabaseClient<Database>;
  const result: SifthubSeedResult = {
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

  logger.info(MODULE, "Starting SiftHub demo seed", { brandId });

  // ── 1. Upsert 28 prompts ──────────────────────────────────────────────────

  const promptIdMap = new Map<number, string>(); // promptIdx → promptId

  for (let i = 0; i < SIFTHUB_PROMPTS.length; i++) {
    const text = SIFTHUB_PROMPTS[i];

    // Check if prompt already exists
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
      .insert({ brand_id: brandId, text, is_active: true, category: "RFP & Proposals" })
      .select("id")
      .single();

    if (error || !newPrompt) {
      logger.warn(MODULE, `Prompt insert failed: ${text}`, { error: error?.message });
      continue;
    }
    promptIdMap.set(i, newPrompt.id as string);
    result.promptsSaved++;
  }

  // Count pre-existing prompts too
  const totalPrompts = promptIdMap.size;
  logger.info(MODULE, `Prompts ready: ${totalPrompts}`, { brandId });

  // ── 2. Insert chat_responses + chat_analysis (run date = yesterday) ───────

  const runDate = exactDate(1); // May 20 equivalent

  for (let i = 0; i < SIFTHUB_PROMPTS.length; i++) {
    const promptId = promptIdMap.get(i);
    if (!promptId) continue;
    const promptText = SIFTHUB_PROMPTS[i];

    for (const model of MODELS) {
      // Skip if response already exists for this prompt+model+date
      const { count: existing } = await db
        .from("chat_responses")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("prompt_id", promptId)
        .eq("ai_model", model)
        .eq("run_date", runDate);

      if ((existing ?? 0) > 0) continue;

      const responseText = generateResponse(promptText, model, i);
      const mentionsSifthub = model === "chatgpt"
        ? SIFTHUB_MENTIONED_CHATGPT.has(i)
        : SIFTHUB_MENTIONED_GEMINI.has(i);
      const allBrands = buildAllBrandsMentioned(i, model);
      const sifthubMention = allBrands.find((b) => b.name === "SiftHub");

      const citationDomains = ["g2.com", "capterra.com", "trustradius.com", "sifthub.io", "reddit.com"];
      const rawSources = citationDomains.slice(0, 3).map((d) => ({ url: `https://${d}` }));

      const { data: savedResp, error: respErr } = await db
        .from("chat_responses")
        .insert({
          brand_id: brandId,
          prompt_id: promptId,
          ai_model: model,
          prompt_text: promptText,
          response_text: responseText,
          raw_sources: rawSources,
          tokens_used: Math.floor(Math.random() * 400) + 200,
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

      const sentimentScore = mentionsSifthub ? (sifthubMention?.sentiment_score ?? 71) : 55;
      const sentimentLabel: "positive" | "neutral" | "negative" =
        sentimentScore >= 60 ? "positive" : sentimentScore >= 40 ? "neutral" : "negative";

      const { error: anaErr } = await db.from("chat_analysis").insert({
        chat_response_id: savedResp.id as string,
        brand_id: brandId,
        prompt_id: promptId,
        ai_model: model,
        run_date: runDate,
        brand_mentioned: mentionsSifthub,
        brand_position: mentionsSifthub ? (sifthubMention?.position ?? 2) : null,
        brand_sentiment: mentionsSifthub ? sentimentScore : null,
        brand_sentiment_label: mentionsSifthub ? sentimentLabel : null,
        brand_mention_context: mentionsSifthub
          ? responseText.slice(0, 200)
          : null,
        all_brands_mentioned: allBrands,
        sources_used: rawSources.map((s) => ({ domain: new URL(s.url).hostname })),
      });

      if (anaErr) {
        logger.warn(MODULE, `chat_analysis failed (${model} prompt=${i})`, { error: anaErr.message });
      } else {
        result.analysesSaved++;
      }

      // source_appearances per response
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

  // ── 3. Brand daily metrics (7 days, exact spec values) ───────────────────
  // daysAgo(7) = oldest (May 14 equiv), daysAgo(1) = newest (May 20 equiv)

  const metricDays = [7, 6, 5, 4, 3, 2, 1]; // oldest → newest

  for (let di = 0; di < metricDays.length; di++) {
    const metricDate = exactDate(metricDays[di]);
    const totalChats = 56;
    const allMentions = Math.round((DAILY_VIS_ALL[di] / 100) * totalChats);
    const cgMentions = Math.round((DAILY_VIS_CHATGPT[di] / 100) * 28);
    const geMentions = Math.round((DAILY_VIS_GEMINI[di] / 100) * 28);

    const metricRows = [
      {
        ai_model: "all",
        visibility_pct: DAILY_VIS_ALL[di],
        avg_position: DAILY_POS_ALL[di],
        avg_sentiment: DAILY_SENT_ALL[di],
        total_chats: totalChats,
        brand_mentions: allMentions,
        positive_mentions: Math.round(allMentions * 0.72),
        neutral_mentions: Math.round(allMentions * 0.21),
        negative_mentions: Math.round(allMentions * 0.07),
      },
      {
        ai_model: "chatgpt",
        visibility_pct: DAILY_VIS_CHATGPT[di],
        avg_position: 2.5,
        avg_sentiment: DAILY_SENT_ALL[di] - 4,
        total_chats: 28,
        brand_mentions: cgMentions,
        positive_mentions: Math.round(cgMentions * 0.65),
        neutral_mentions: Math.round(cgMentions * 0.25),
        negative_mentions: Math.round(cgMentions * 0.10),
      },
      {
        ai_model: "gemini",
        visibility_pct: DAILY_VIS_GEMINI[di],
        avg_position: 1.5,
        avg_sentiment: DAILY_SENT_ALL[di] + 2,
        total_chats: 28,
        brand_mentions: geMentions,
        positive_mentions: Math.round(geMentions * 0.75),
        neutral_mentions: Math.round(geMentions * 0.18),
        negative_mentions: Math.round(geMentions * 0.07),
      },
    ];

    for (const row of metricRows) {
      const { error } = await db.from("brand_daily_metrics").upsert(
        {
          brand_id: brandId,
          ai_model: row.ai_model,
          metric_date: metricDate,
          total_chats: row.total_chats,
          brand_mentions: row.brand_mentions,
          visibility_pct: row.visibility_pct,
          avg_position: row.avg_position,
          avg_sentiment: row.avg_sentiment,
          positive_mentions: row.positive_mentions,
          neutral_mentions: row.neutral_mentions,
          negative_mentions: row.negative_mentions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "brand_id,ai_model,metric_date" },
      );
      if (!error) result.metricsSaved++;
    }
  }

  // ── 4. Competitors (5 entries) ────────────────────────────────────────────

  const sifthubCompetitors = [
    { competitor_name: "1up", domain: "https://1up.ai",        website: "https://1up.ai" },
    { competitor_name: "Heyiris", domain: "https://heyiris.ai",    website: "https://heyiris.ai" },
    { competitor_name: "Inventive", domain: "https://inventive.ai",   website: "https://inventive.ai" },
    { competitor_name: "Autorfp", domain: "https://autorfp.ai",    website: "https://autorfp.ai" },
  ];

  for (const comp of sifthubCompetitors) {
    const { count: existingComp } = await db
      .from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("competitor_name", comp.competitor_name);

    if ((existingComp ?? 0) === 0) {
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

  // ── 5. Source appearances (domain-level citations) ────────────────────────

  const citationDomains = [
    { domain: "sifthub.io",         count: 45 },
    { domain: "g2.com",             count: 38 },
    { domain: "capterra.com",       count: 29 },
    { domain: "trustradius.com",    count: 22 },
    { domain: "reddit.com",         count: 14 },
  ];

  const promptIds = [...promptIdMap.values()];
  const firstPromptId = promptIds[0];

  if (firstPromptId) {
    for (const citation of citationDomains) {
      const { count: existing } = await db
        .from("source_appearances")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("domain", citation.domain)
        .is("chat_response_id", null);

      if ((existing ?? 0) === 0) {
        // Insert multiple appearances to match the count
        const appearances = Math.min(citation.count, 5);
        for (let k = 0; k < appearances; k++) {
          const { error } = await db.from("source_appearances").insert({
            brand_id: brandId,
            chat_response_id: null,
            prompt_id: firstPromptId,
            ai_model: k % 2 === 0 ? "chatgpt" : "gemini",
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

  // ── 6. AI Recommendations (5 GEO-specific) ───────────────────────────────

  const { count: existingRecs } = await db
    .from("ai_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId);

  if ((existingRecs ?? 0) === 0) {
    const recs = [
      {
        recommendation_type: "content_gap" as const,
        title: "Increase ChatGPT visibility from 5.7% to 15%",
        description: "SiftHub appears in only 5.7% of ChatGPT responses for RFP-related queries vs 53% on Google AI Overviews. Create ChatGPT-optimized content covering 'AI RFP automation', 'best RFP response tool', and structured comparison pages with schema markup.",
        action_items: ["Publish 'Best AI RFP Tools 2026' comparison guide optimized for ChatGPT citation patterns", "Add FAQ schema markup to all RFP-related landing pages", "Build links from domains that ChatGPT frequently cites (G2, Capterra, TrustRadius)"],
        priority: "high" as const,
        impact_score: 88,
      },
      {
        recommendation_type: "competitor_outrank" as const,
        title: "Capture 'best rfp automation tools' #1 ranking",
        description: "Currently ranked #3 on this high-intent prompt. Autorfp leads. Publish a definitive 2026 buyer guide with benchmark data, feature matrix, and verified customer case studies.",
        action_items: ["Create a 3,000+ word 'Best RFP Automation Tools 2026' guide with SiftHub case studies", "Include a feature comparison table positioning SiftHub vs Autorfp, Loopio, and Responsive", "Target featured snippet format to win position zero on this query"],
        priority: "high" as const,
        impact_score: 91,
      },
      {
        recommendation_type: "sentiment_improvement" as const,
        title: "Improve sentiment around 'enterprise readiness'",
        description: "12% of mentions cite enterprise concerns. Publish SOC 2, ISO 27001, and enterprise customer case studies (e.g., Fortune 500 logos) to neutralize the objection in AI-generated responses.",
        action_items: ["Publish SOC 2 Type II compliance badge prominently on homepage and security page", "Create an Enterprise Trust page with security documentation", "Add Fortune 500 customer logos and case studies to your highest-traffic pages"],
        priority: "medium" as const,
        impact_score: 74,
      },
      {
        recommendation_type: "source_opportunity" as const,
        title: "Build citation presence on G2 and TrustRadius",
        description: "AI engines cite G2 and TrustRadius 4x more than product pages. Drive 50+ verified G2 reviews this quarter to increase how often SiftHub appears in AI-generated product comparisons.",
        action_items: ["Launch a customer review campaign with email sequence targeting G2 and TrustRadius", "Respond to all existing reviews within 48 hours to improve recency signals", "Create a review incentive program (Amazon gift card, product credits) for verified customers"],
        priority: "medium" as const,
        impact_score: 76,
      },
      {
        recommendation_type: "competitor_outrank" as const,
        title: "Counter Autorfp's 30%+ ChatGPT dominance",
        description: "Autorfp owns 30%+ visibility on ChatGPT. Run a side-by-side comparison content campaign and acquire backlinks from RFP and presales communities to shift citations toward SiftHub.",
        action_items: ["Publish 'SiftHub vs AutoRFP.ai' comparison page targeting high-intent searches", "Submit to presales community forums (r/sales, PreSales Collective) with SiftHub positioning", "Acquire links from RFP consultant blogs and procurement publications"],
        priority: "high" as const,
        impact_score: 86,
      },
    ];

    const { error } = await db.from("ai_recommendations").insert(
      recs.map((r) => ({ brand_id: brandId, ...r, status: "open" })),
    );
    if (!error) result.recommendationsSaved = recs.length;
    else logger.warn(MODULE, "Recommendations insert failed", { error: error.message });
  }

  result.seeded = true;
  result.message = `SiftHub demo seed complete: ${result.promptsSaved} new prompts, ${result.responsesSaved} responses, ${result.analysesSaved} analyses, ${result.metricsSaved} metrics, ${result.competitorsSaved} competitors, ${result.sourcesSaved} sources, ${result.recommendationsSaved} recommendations`;
  logger.info(MODULE, result.message, { brandId });
  return result;
}
