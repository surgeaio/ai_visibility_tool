import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  DEMO_ACTIVITY,
  DEMO_BRAND,
  DEMO_CHART_DATA,
  DEMO_GOOGLE_SUMMARY,
  DEMO_LLM_PLATFORM_SCORES,
  DEMO_MODEL_COVERAGE,
  DEMO_POSITION_RANKING,
  DEMO_RECOMMENDATIONS,
  DEMO_SENTIMENT_DIST,
} from "@/lib/demo/seed-data";

export type DashboardRange = "7d" | "30d" | "90d";

function rangeToMs(range: DashboardRange): number {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return days * 86400_000;
}

export interface DashboardOverviewPayload {
  source: "live" | "demo";
  brandName: string;
  kpis: {
    visibility: number;
    sentiment: number;
    position: number;
    promptsTracked: number;
  };
  googleSummary: { avgPosition: number; clicks: number; impressions: number; ctr: number } | null;
  llmOverall: number | null;
  llmPlatformScores: { platform: string; score: number; sentiment: "positive" | "neutral" | "negative" }[];
  sentimentDist: { positive: number; neutral: number; negative: number };
  visibilityTrend: { label: string; score: number }[];
  modelCoverage: { model: string; visibility: number }[];
  positionRanking: { name: string; position: number; highlight: boolean }[];
  activity: {
    id: string;
    prompt: string;
    brand: string;
    sentiment: number | null;
    model: string;
    at: string;
    excerpt: string;
  }[];
  recommendations: { pending: number; urgentHigh: number };
}

export async function getLiveDashboardOverview(
  supabase: SupabaseClient<Database>,
  brandId: string,
  brandName: string,
  range: DashboardRange,
): Promise<DashboardOverviewPayload> {
  const from = new Date(Date.now() - rangeToMs(range)).toISOString();
  const fromDay = from.slice(0, 10);

  const { count: promptCount } = await supabase
    .from("prompts")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("is_active", true);

  const { data: perf, error: pErr } = await supabase
    .from("llm_brand_performance")
    .select("id, visibility_score, sentiment, sentiment_score, measured_at, rank_position, context, prompt_id, platform_id")
    .eq("brand_id", brandId)
    .gte("measured_at", from)
    .order("measured_at", { ascending: false })
    .limit(500);

  if (pErr) throw new Error(pErr.message);

  const rows = perf ?? [];
  const platformIds = [...new Set(rows.map((r) => r.platform_id).filter(Boolean))] as string[];
  let platNames = new Map<string, string>();
  if (platformIds.length) {
    const { data: plats } = await supabase.from("llm_platforms").select("id, display_name").in("id", platformIds);
    platNames = new Map((plats ?? []).map((p) => [p.id, p.display_name]));
  }
  const visScores = rows.map((r) => Number(r.visibility_score ?? 0)).filter((n) => !Number.isNaN(n) && n > 0);
  const visibility = visScores.length ? Math.round(visScores.reduce((a, b) => a + b, 0) / visScores.length) : 0;

  const sentScores = rows
    .map((r) => Number(r.sentiment_score ?? NaN))
    .filter((n) => !Number.isNaN(n));
  const sentiment = sentScores.length
    ? Math.round(sentScores.reduce((a, b) => a + b, 0) / sentScores.length)
    : 55;

  const rankScores = rows
    .map((r) => Number(r.rank_position ?? NaN))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const position =
    rankScores.length > 0
      ? Math.round((rankScores.reduce((a, b) => a + b, 0) / rankScores.length) * 10) / 10
      : 0;

  let pos = 0;
  let neu = 0;
  let neg = 0;
  for (const r of rows) {
    const s = (r.sentiment ?? "").toLowerCase();
    if (s.includes("pos")) pos += 1;
    else if (s.includes("neg")) neg += 1;
    else if (r.sentiment) neu += 1;
  }
  const sTotal = pos + neu + neg || 1;
  const sentimentDist = {
    positive: Math.round((pos / sTotal) * 100),
    neutral: Math.round((neu / sTotal) * 100),
    negative: Math.round((neg / sTotal) * 100),
  };

  const byDay = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const d = (r.measured_at ?? "").slice(0, 10);
    if (!d) continue;
    const v = Number(r.visibility_score ?? 0);
    if (!v) continue;
    const cur = byDay.get(d) ?? { sum: 0, n: 0 };
    cur.sum += v;
    cur.n += 1;
    byDay.set(d, cur);
  }
  const visibilityTrend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, v]) => ({ label, score: v.n ? Math.round(v.sum / v.n) : 0 }));

  const byPlat = new Map<string, { sum: number; n: number; sent: string[] }>();
  for (const r of rows) {
    const plat = platNames.get(r.platform_id ?? "") ?? "Unknown";
    const cur = byPlat.get(plat) ?? { sum: 0, n: 0, sent: [] };
    const v = Number(r.visibility_score ?? 0);
    if (v) {
      cur.sum += v;
      cur.n += 1;
    }
    if (r.sentiment) cur.sent.push(r.sentiment);
    byPlat.set(plat, cur);
  }
  const modelCoverage = Array.from(byPlat.entries()).map(([model, v]) => ({
    model,
    visibility: v.n ? Math.round(v.sum / v.n) : 0,
  }));

  const llmPlatformScores = Array.from(byPlat.entries()).map(([platform, v]) => {
    const avg = v.n ? Math.round(v.sum / v.n) : 0;
    const low = v.sent.map((x) => x.toLowerCase());
    const sentimentLabel: "positive" | "neutral" | "negative" = low.some((x) => x.includes("neg"))
      ? "negative"
      : low.some((x) => x.includes("pos"))
        ? "positive"
        : "neutral";
    return { platform, score: avg, sentiment: sentimentLabel };
  });

  const llmOverall = modelCoverage.length
    ? Math.round(modelCoverage.reduce((a, p) => a + p.visibility, 0) / modelCoverage.length)
    : null;

  const { data: gr } = await supabase
    .from("google_rankings")
    .select("position, impressions, clicks, ctr")
    .eq("brand_id", brandId)
    .gte("measured_date", fromDay);

  const gRows = gr ?? [];
  const gImpr = gRows.reduce((a, r) => a + (r.impressions ?? 0), 0);
  const gClicks = gRows.reduce((a, r) => a + (r.clicks ?? 0), 0);
  const gWeighted = gRows.reduce((a, r) => a + Number(r.position ?? 0) * (r.impressions ?? 0), 0);
  const googleSummary =
    gRows.length > 0
      ? {
          avgPosition: gImpr > 0 ? Number((gWeighted / gImpr).toFixed(2)) : 0,
          clicks: gClicks,
          impressions: gImpr,
          ctr: gImpr > 0 ? gClicks / gImpr : 0,
        }
      : null;

  const { data: comps } = await supabase
    .from("competitors")
    .select("competitor_name")
    .eq("brand_id", brandId)
    .limit(8);

  const positionRanking = (comps ?? []).map((c) => ({
    name: c.competitor_name,
    position: 0,
    highlight: false,
  }));
  if (positionRanking.length === 0) {
    positionRanking.push({ name: brandName, position, highlight: true });
  } else {
    positionRanking.unshift({ name: `${brandName} (you)`, position, highlight: true });
  }

  const activity = rows.slice(0, 12).map((r) => {
    const plat = platNames.get(r.platform_id ?? "") ?? "LLM";
    const pid = r.prompt_id ? `${r.prompt_id.slice(0, 8)}…` : "—";
    return {
      id: r.id,
      prompt: `Prompt ${pid}`,
      brand: brandName,
      sentiment: r.sentiment_score != null ? Math.round(Number(r.sentiment_score)) : null,
      model: plat,
      at: r.measured_at ?? new Date().toISOString(),
      excerpt: (r.context ?? "").slice(0, 120),
    };
  });

  const { count: recPending } = await supabase
    .from("recommendations")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("status", "pending");

  const { count: recUrgent } = await supabase
    .from("recommendations")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brandId)
    .eq("status", "pending")
    .eq("priority", "high");

  return {
    source: "live",
    brandName,
    kpis: {
      visibility,
      sentiment,
      position,
      promptsTracked: promptCount ?? 0,
    },
    googleSummary,
    llmOverall,
    llmPlatformScores: llmPlatformScores.length ? llmPlatformScores : [],
    sentimentDist,
    visibilityTrend: visibilityTrend.length ? visibilityTrend : [{ label: "—", score: visibility }],
    modelCoverage: modelCoverage.length ? modelCoverage : [{ model: "—", visibility: 0 }],
    positionRanking,
    activity,
    recommendations: {
      pending: recPending ?? 0,
      urgentHigh: recUrgent ?? 0,
    },
  };
}

export function buildDemoDashboardOverview(brandName: string): DashboardOverviewPayload {
  const pendingRecs = DEMO_RECOMMENDATIONS.filter((r) => r.status === "pending");
  const llmOverall = Math.round(
    DEMO_LLM_PLATFORM_SCORES.reduce((a, p) => a + p.score, 0) / DEMO_LLM_PLATFORM_SCORES.length,
  );
  const visibilityTrend = DEMO_CHART_DATA.visibility.map((row) => ({
    label: row.month,
    score: row.attio,
  }));
  return {
    source: "demo",
    brandName: brandName || DEMO_BRAND.name,
    kpis: {
      visibility: DEMO_BRAND.metrics.visibility,
      sentiment: DEMO_BRAND.metrics.sentiment,
      position: DEMO_BRAND.metrics.position,
      promptsTracked: DEMO_BRAND.metrics.promptsTracked,
    },
    googleSummary: {
      avgPosition: DEMO_GOOGLE_SUMMARY.avgPosition,
      clicks: DEMO_GOOGLE_SUMMARY.clicks,
      impressions: DEMO_GOOGLE_SUMMARY.impressions,
      ctr: DEMO_GOOGLE_SUMMARY.ctr,
    },
    llmOverall,
    llmPlatformScores: DEMO_LLM_PLATFORM_SCORES.map((p) => ({
      platform: p.platform,
      score: p.score,
      sentiment: p.sentiment,
    })),
    sentimentDist: {
      positive: DEMO_SENTIMENT_DIST.positive,
      neutral: DEMO_SENTIMENT_DIST.neutral,
      negative: DEMO_SENTIMENT_DIST.negative,
    },
    visibilityTrend,
    modelCoverage: DEMO_MODEL_COVERAGE.map((m) => ({ model: m.model, visibility: m.visibility })),
    positionRanking: DEMO_POSITION_RANKING.map((r) => ({
      name: r.name,
      position: r.position,
      highlight: r.highlight,
    })),
    activity: DEMO_ACTIVITY.map((a) => ({
      id: a.id,
      prompt: a.prompt,
      brand: a.brand,
      sentiment: a.sentiment,
      model: a.model,
      at: a.at,
      excerpt: a.excerpt,
    })),
    recommendations: {
      pending: pendingRecs.length,
      urgentHigh: pendingRecs.filter((r) => r.priority === "high").length,
    },
  };
}
