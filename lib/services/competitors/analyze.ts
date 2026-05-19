import { getAdminClient } from "@/lib/services/competitors/access";

type GapRow = {
  query: string;
  position: number;
  page_url: string;
  page_title: string | null;
  page_snippet: string | null;
  your_position: number | null;
  competitor_domain: string;
};

type AnalysisPayload = {
  winning_factors?: Array<{ factor: string; evidence?: string }>;
  action_items?: Array<{ priority: string; action: string; expected_impact?: string }>;
  summary?: string;
};

export async function generateCompetitorAnalysis(brandId: string) {
  const supabase = await getAdminClient();

  const { data: gaps } = await supabase
    .from("competitor_rankings")
    .select("query, position, page_url, page_title, page_snippet, your_position, competitor_domain")
    .eq("brand_id", brandId)
    .order("position_gap", { ascending: false })
    .limit(20);

  if (!gaps?.length) {
    return { generated: 0, reason: "No competitor rankings to analyze" };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { generated: 0, reason: "OPENAI_API_KEY not configured" };
  }

  const byCompetitor = new Map<string, GapRow[]>();
  for (const g of gaps as GapRow[]) {
    const list = byCompetitor.get(g.competitor_domain) ?? [];
    list.push(g);
    byCompetitor.set(g.competitor_domain, list);
  }

  let generated = 0;

  for (const [domain, queries] of Array.from(byCompetitor.entries()).slice(0, 3)) {
    const prompt = buildPrompt(domain, queries);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        console.error("[analyze] OpenAI failed:", await res.text());
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      const analysis = JSON.parse(content) as AnalysisPayload;

      await supabase.from("competitor_analysis").insert({
        brand_id: brandId,
        competitor_domain: domain,
        analysis_type: "why_they_win",
        winning_factors: analysis.winning_factors ?? [],
        action_items: analysis.action_items ?? [],
        raw_analysis: analysis.summary ?? "",
        model_used: "gpt-4o-mini",
      });

      generated++;
    } catch (err) {
      console.error(`[analyze] failed for ${domain}:`, err);
    }
  }

  return { generated };
}

function buildPrompt(domain: string, queries: GapRow[]) {
  const lines = queries
    .slice(0, 10)
    .map(
      (q, i) => `
${i + 1}. Query: "${q.query}"
   Their position: ${q.position} (URL: ${q.page_url})
   Their title: ${q.page_title ?? "N/A"}
   Their snippet: ${q.page_snippet?.slice(0, 200) ?? "N/A"}
   Our position: ${q.your_position ?? "Not ranking"}
`,
    )
    .join("\n");

  return `You are an SEO expert analyzing competitor rankings.

Our brand competes with ${domain}. Below are queries where they outrank us:
${lines}

Analyze WHY ${domain} outranks us. Identify 3-5 winning factors (title patterns, content angles, snippet quality, URL structure).

Then provide 5 specific action items to beat them.

Respond in JSON:
{
  "winning_factors": [{"factor": "...", "evidence": "..."}],
  "action_items": [{"priority": "high|medium|low", "action": "...", "expected_impact": "..."}],
  "summary": "Two sentence summary"
}`;
}
