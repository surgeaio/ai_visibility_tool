import Anthropic from "@anthropic-ai/sdk";
import {
  createOpenRouterClient,
  hasOpenRouter,
} from "@/lib/ai/openrouter-client";
import { AI_MODELS } from "@/lib/ai/models";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

function requireAdmin() {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return admin;
}

export async function generateVisibilityRecommendationsForBrand(brandId: string) {
  const supabase = requireAdmin();
  const useOpenRouter = hasOpenRouter();
  const directKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!useOpenRouter && !directKey) {
    throw new Error("OPENROUTER_API_KEY or ANTHROPIC_API_KEY required for recommendations");
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("name, domain, website")
    .eq("id", brandId)
    .single();

  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const { data: topSources } = await supabase
    .from("source_appearances")
    .select("domain")
    .eq("brand_id", brandId)
    .gte("run_date", since);

  const domainCounts: Record<string, number> = {};
  for (const s of topSources ?? []) {
    const d = s.domain as string;
    domainCounts[d] = (domainCounts[d] ?? 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([domain, count]) => ({ domain, count }));

  const { data: recentMetrics } = await supabase
    .from("brand_daily_metrics")
    .select("visibility_pct, avg_sentiment")
    .eq("brand_id", brandId)
    .eq("ai_model", "all")
    .order("metric_date", { ascending: false })
    .limit(7);

  const avgVisibility = recentMetrics?.length
    ? recentMetrics.reduce((s, m) => s + Number(m.visibility_pct ?? 0), 0) / recentMetrics.length
    : 0;
  const avgSentiment = recentMetrics?.length
    ? recentMetrics.reduce((s, m) => s + Number(m.avg_sentiment ?? 0), 0) / recentMetrics.length
    : null;

  const { data: negSamples } = await supabase
    .from("chat_analysis")
    .select("brand_mention_context, ai_model")
    .eq("brand_id", brandId)
    .eq("brand_sentiment_label", "negative")
    .order("run_date", { ascending: false })
    .limit(5);

  const userPrompt = `You are an AI Search Optimization (GEO/AEO) strategist. Generate 5-8 actionable recommendations for this brand to improve AI visibility.

Brand: ${brand?.name ?? "Unknown"} (${brand?.domain ?? brand?.website ?? "no domain"})

Current Metrics (last 7 days, all AI models):
- Visibility: ${avgVisibility.toFixed(1)}%
- Sentiment: ${avgSentiment != null ? avgSentiment.toFixed(1) : "N/A"}/100

Top Domains AI Cites in This Industry:
${topDomains.map((d) => `- ${d.domain} (${d.count} citations)`).join("\n") || "None yet"}

Negative Sentiment Examples:
${
  (negSamples ?? [])
    .map((s) => `- [${s.ai_model}] "${s.brand_mention_context}"`)
    .join("\n") || "None"
}

Return ONLY valid JSON (no markdown):
{
  "recommendations": [
    {
      "type": "source_opportunity" | "content_gap" | "sentiment_improvement" | "competitor_outrank" | "prompt_suggestion",
      "title": "<short title>",
      "description": "<2-3 sentence explanation>",
      "action_items": ["<step 1>", "<step 2>"],
      "priority": "high" | "medium" | "low",
      "impact_score": <0-100>
    }
  ]
}`;

  let rawText = "";
  if (useOpenRouter) {
    const client = createOpenRouterClient(null, 60_000);
    if (!client) throw new Error("OpenRouter client unavailable");
    const completion = await client.chat.completions.create({
      model: AI_MODELS.claude,
      max_tokens: 3000,
      messages: [{ role: "user", content: userPrompt }],
    });
    rawText = completion.choices[0]?.message?.content ?? "";
  } else {
    const anthropic = new Anthropic({ apiKey: directKey! });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: userPrompt }],
    });
    rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
  }

  const raw = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  let parsed: { recommendations?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(raw) as { recommendations?: Array<Record<string, unknown>> };
  } catch {
    parsed = { recommendations: [] };
  }

  await supabase
    .from("ai_recommendations")
    .delete()
    .eq("brand_id", brandId)
    .eq("status", "open");

  const rows = (parsed.recommendations ?? []).map((r) => ({
    brand_id: brandId,
    recommendation_type: String(r.type ?? "content_gap"),
    title: String(r.title ?? "Recommendation"),
    description: String(r.description ?? ""),
    action_items: Array.isArray(r.action_items) ? r.action_items : [],
    priority: String(r.priority ?? "medium"),
    impact_score: Number(r.impact_score ?? 50),
    status: "open",
  }));

  if (rows.length > 0) {
    await supabase.from("ai_recommendations").insert(rows);
  }

  return { count: rows.length, recommendations: rows };
}
