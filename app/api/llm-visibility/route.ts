import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { llmVisibilityQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  DEMO_LLM_PLATFORM_SCORES,
  DEMO_LLM_TREND,
  DEMO_PROMPTS,
} from "@/lib/demo/seed-data";
import type { LlmVisibilityPayload } from "@/lib/types/llm-visibility";

function rangeToMs(range: "7d" | "30d" | "90d"): number {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return days * 24 * 60 * 60 * 1000;
}

function demoPayload(): LlmVisibilityPayload {
  const overall = Math.round(
    DEMO_LLM_PLATFORM_SCORES.reduce((a, p) => a + p.score, 0) / DEMO_LLM_PLATFORM_SCORES.length,
  );
  const topPrompts = [...DEMO_PROMPTS]
    .filter((p) => p.sentiment != null)
    .sort((a, b) => (b.sentiment ?? 0) - (a.sentiment ?? 0))
    .slice(0, 5)
    .map((p) => ({ id: p.id, text: p.text, avgScore: p.sentiment }));
  const needsAttention = DEMO_PROMPTS.filter(
    (p) => !p.visibility || (p.sentiment != null && p.sentiment < 72),
  ).map((p) => ({
    id: p.id,
    text: p.text,
    issue: !p.visibility ? "Not visible" : "Low score or mixed signals",
  }));
  return {
    empty: false,
    overall,
    platformScores: DEMO_LLM_PLATFORM_SCORES.map((p) => ({
      platform: p.platform,
      score: p.score,
      sentiment: p.sentiment,
    })),
    trend: DEMO_LLM_TREND,
    topPrompts,
    needsAttention,
  };
}

function sentimentBucket(
  s: string | null,
): "positive" | "neutral" | "negative" {
  if (s === "positive" || s === "negative" || s === "neutral") return s;
  return "neutral";
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, llmVisibilityQuerySchema, requestId);
  if (!q.success) return q.response;

  const { brandId, range } = q.data;

  if (isAuthBypassMode()) {
    return Response.json({ source: "demo" as const, data: demoPayload(), requestId });
  }

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const userClient = await createServerSupabaseClient();
    const { data: brandRow } = await userClient
      .from("brands")
      .select("id, name")
      .eq("id", brandId)
      .maybeSingle();

    if (!brandRow) {
      console.warn("[llm-visibility] brand not visible to user", { brandId, userId });
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const admin = tryCreateAdminSupabaseClient();
    const db = admin ?? userClient;

    const from = new Date(Date.now() - rangeToMs(range)).toISOString();
    console.log("[llm-visibility] query", { brandId, range, from, usingAdmin: Boolean(admin) });

    const { data: perfRows, error: perfError } = await db
      .from("llm_brand_performance")
      .select("platform_id, visibility_score, sentiment, measured_at, prompt_id, is_mentioned")
      .eq("brand_id", brandId)
      .gte("measured_at", from)
      .order("measured_at", { ascending: false });

    if (perfError) {
      return serverErrorResponse(perfError.message, requestId);
    }

    const rows = perfRows ?? [];
    console.log("[llm-visibility] rows returned:", rows.length);

    if (rows.length === 0) {
      const empty: LlmVisibilityPayload = {
        empty: true,
        overall: null,
        platformScores: [],
        trend: [],
        topPrompts: [],
        needsAttention: [],
      };
      return Response.json({ source: "live" as const, data: empty, requestId });
    }

    const platformIds = [...new Set(rows.map((r) => r.platform_id).filter(Boolean))] as string[];
    const { data: platRows } = await db
      .from("llm_platforms")
      .select("id, name, display_name")
      .in("id", platformIds);

    const platMap = new Map(
      (platRows ?? []).map((p) => [p.id as string, p as { name: string; display_name: string }]),
    );

    const scoresBySlug = new Map<string, { sum: number; n: number; lastSent: string | null }>();
    for (const r of rows) {
      if (!r.platform_id || r.visibility_score == null) continue;
      const slug = platMap.get(r.platform_id)?.name ?? "unknown";
      const cur = scoresBySlug.get(slug) ?? { sum: 0, n: 0, lastSent: null };
      cur.sum += Number(r.visibility_score);
      cur.n += 1;
      if (!cur.lastSent && r.sentiment) cur.lastSent = r.sentiment;
      scoresBySlug.set(slug, cur);
    }

    const slugToDisplay = new Map(
      (platRows ?? []).map((p) => [p.name as string, (p as { display_name: string }).display_name]),
    );

    const platformScores = [...scoresBySlug.entries()].map(([slug, v]) => ({
      platform: slugToDisplay.get(slug) ?? slug,
      score: Math.round(v.sum / Math.max(1, v.n)),
      sentiment: sentimentBucket(v.lastSent),
    }));

    const overall =
      platformScores.length > 0
        ? Math.round(platformScores.reduce((a, p) => a + p.score, 0) / platformScores.length)
        : null;

    const trendMap = new Map<string, { chatgpt: number; claude: number; gemini: number; perplexity: number }>();
    for (const r of rows) {
      if (!r.platform_id || r.visibility_score == null || !r.measured_at) continue;
      const slug = platMap.get(r.platform_id)?.name;
      if (!slug) continue;
      const day = (r.measured_at as string).slice(0, 10);
      const bucket = trendMap.get(day) ?? { chatgpt: 0, claude: 0, gemini: 0, perplexity: 0 };
      const key = slug as keyof typeof bucket;
      if (key in bucket) {
        bucket[key] = Math.max(bucket[key], Number(r.visibility_score));
      }
      trendMap.set(day, bucket);
    }
    const trend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({
        day,
        chatgpt: v.chatgpt,
        claude: v.claude,
        gemini: v.gemini,
        perplexity: v.perplexity,
      }));

    const promptIds = [...new Set(rows.map((r) => r.prompt_id).filter(Boolean))] as string[];
    const promptText = new Map<string, string>();
    if (promptIds.length) {
      const { data: prompts } = await db.from("prompts").select("id, text").in("id", promptIds);
      for (const p of prompts ?? []) {
        promptText.set(p.id as string, p.text as string);
      }
    }

    const byPrompt = new Map<string, number[]>();
    for (const r of rows) {
      if (!r.prompt_id || r.visibility_score == null) continue;
      const list = byPrompt.get(r.prompt_id) ?? [];
      list.push(Number(r.visibility_score));
      byPrompt.set(r.prompt_id, list);
    }
    const topPrompts = [...byPrompt.entries()]
      .map(([id, vals]: [string, number[]]) => ({
        id,
        text: promptText.get(id) ?? id,
        avgScore: Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
      .slice(0, 8);

    const needsAttention = [...byPrompt.entries()]
      .filter(([, vals]) => vals.every((s: number) => s < 55))
      .map(([id]) => ({
        id,
        text: promptText.get(id) ?? id,
        issue: "Low visibility across assistants",
      }))
      .slice(0, 8);

    const data: LlmVisibilityPayload = {
      empty: false,
      overall,
      platformScores,
      trend: trend.length ? trend : [],
      topPrompts,
      needsAttention,
    };

    return Response.json({ source: "live" as const, data, requestId });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to load LLM visibility", requestId);
  }
}
