export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { llmVisibilityQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildLlmVisibilityDashboard } from "@/lib/services/llm-visibility-dashboard";
import { ensureLlmPlatformsSeeded } from "@/lib/services/llm-platforms-seed";

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, llmVisibilityQuerySchema, requestId);
  if (!q.success) return q.response;

  const { brandId, range, brandIds: brandIdsParam, models, promptIds, focusPromptId } = q.data;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const userClient = await createServerSupabaseClient();
    const { data: userBrands, error: brandsErr } = await userClient
      .from("brands")
      .select("id, name")
      .eq("user_id", userId)
      .order("name");

    if (brandsErr) {
      return serverErrorResponse(brandsErr.message, requestId);
    }

    const availableBrands = (userBrands ?? []).map((b) => ({
      id: b.id as string,
      name: b.name as string,
    }));

    const ownedIds = new Set(availableBrands.map((b) => b.id));
    if (!ownedIds.has(brandId)) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const requestedIds = parseCsv(brandIdsParam);
    const selectedBrandIds =
      requestedIds.length > 0
        ? requestedIds.filter((id) => ownedIds.has(id))
        : [brandId];
    if (!selectedBrandIds.length) selectedBrandIds.push(brandId);

    const admin = tryCreateAdminSupabaseClient();
    const db = admin ?? userClient;
    await ensureLlmPlatformsSeeded();

    const days =
      range === "90d" ? 90 : range === "30d" ? 30 : range === "14d" ? 14 : 7;
    const from = new Date(Date.now() - days * 86400_000).toISOString();
    const fromDate = from.slice(0, 10);

    const { data: perfRows, error: perfError } = await db
      .from("llm_brand_performance")
      .select(
        "brand_id, platform_id, prompt_id, visibility_score, rank_position, measured_at",
      )
      .in("brand_id", selectedBrandIds)
      .gte("measured_at", from)
      .order("measured_at", { ascending: true });

    if (perfError) {
      return serverErrorResponse(perfError.message, requestId);
    }

    let perfRowsForDashboard = perfRows ?? [];
    if (!perfRowsForDashboard.length) {
      const { data: dailyMetrics } = await db
        .from("brand_daily_metrics")
        .select("brand_id, metric_date, visibility_pct, avg_position, ai_model")
        .eq("brand_id", brandId)
        .eq("ai_model", "all")
        .gte("metric_date", fromDate)
        .order("metric_date", { ascending: true });

      perfRowsForDashboard = (dailyMetrics ?? []).map((row) => ({
        brand_id: row.brand_id as string,
        platform_id: null,
        prompt_id: null,
        visibility_score: row.visibility_pct != null ? Number(row.visibility_pct) : null,
        rank_position: row.avg_position != null ? Number(row.avg_position) : null,
        measured_at: `${row.metric_date as string}T12:00:00.000Z`,
      }));
    }

    const { data: platRows } = await db.from("llm_platforms").select("id, name, display_name");
    const platforms = (platRows ?? []) as Array<{
      id: string;
      name: string;
      display_name: string;
    }>;

    const { data: promptRows } = await db
      .from("prompts")
      .select("id, text")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const prompts = (promptRows ?? []).map((p) => ({
      id: p.id as string,
      prompt: (p.text as string) ?? "",
    }));

    const payload = buildLlmVisibilityDashboard({
      range,
      brandRows: availableBrands,
      perfRows: perfRowsForDashboard,
      platforms,
      prompts,
      selectedBrandIds,
      selectedModelSlugs: parseCsv(models),
      selectedPromptIds: parseCsv(promptIds),
      focusPromptId: focusPromptId ?? null,
    });

    return Response.json({ ...payload, requestId });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to load LLM visibility", requestId);
  }
}
