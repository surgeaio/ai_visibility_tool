export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { llmVisibilityQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildLlmVisibilityDashboard } from "@/lib/services/llm-visibility-dashboard";
import { loadRecentModelErrors, loadVisibilityPerfRows } from "@/lib/services/llm-visibility-data";
import { ensureLlmPlatformsSeeded } from "@/lib/services/llm-platforms-seed";
import { ALL_AVAILABLE_MODELS } from "@/lib/ai/models";
import { ensureBrandHasDemoData } from "@/lib/services/demo-data-seeder";

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
    console.log(`[llm-visibility] GET brandId=${brandId} range=${range}`);

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

    // Auto-seed demo data if the brand has no data yet (non-blocking, best-effort)
    const currentBrand = availableBrands.find((b) => b.id === brandId);
    if (currentBrand) {
      await ensureBrandHasDemoData(brandId, currentBrand.name);
    }

    const requestedIds = parseCsv(brandIdsParam);
    const selectedBrandIds =
      requestedIds.length > 0
        ? requestedIds.filter((id) => ownedIds.has(id))
        : [brandId];
    if (!selectedBrandIds.length) selectedBrandIds.push(brandId);

    const db = createAdminSupabaseClient();

    try {
      await ensureLlmPlatformsSeeded();
    } catch (seedErr) {
      console.warn("[llm-visibility] platform seed skipped:", seedErr);
    }

    const days =
      range === "90d" ? 90 : range === "30d" ? 30 : range === "14d" ? 14 : 7;
    const from = new Date(Date.now() - days * 86400_000).toISOString();
    const fromDate = from.slice(0, 10);

    const perfRowsForDashboard = await loadVisibilityPerfRows(
      db,
      selectedBrandIds,
      from,
      fromDate,
    );

    const { data: platRows, error: platError } = await db
      .from("llm_platforms")
      .select("id, name, display_name");

    if (platError) {
      console.error("[llm-visibility] llm_platforms error:", platError.message);
    }

    const platforms = (platRows ?? []) as Array<{
      id: string;
      name: string;
      display_name: string;
    }>;

    const { data: promptRows, error: promptError } = await db
      .from("prompts")
      .select("id, text")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (promptError) {
      console.error("[llm-visibility] prompts error:", promptError.message);
    }

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

    if (payload.empty) {
      const diagnostics = await loadRecentModelErrors(db, selectedBrandIds, from);
      if (diagnostics.errors.length > 0 || (diagnostics.responsesInRange ?? 0) > 0) {
        payload.emptyReason = diagnostics.errors.length > 0 ? "runs_failed" : "no_data";
        payload.recentModelErrors = diagnostics.errors;
        payload.responsesInRange = diagnostics.responsesInRange;
      } else {
        payload.emptyReason = "no_data";
      }
    }

    // Ensure availableModels is never empty so the UI filter always has options
    if (!payload.availableModels.length) {
      payload.availableModels = ALL_AVAILABLE_MODELS;
    }

    console.log(
      `[llm-visibility] response empty=${payload.empty} chartPoints=${payload.chartData.length} reason=${payload.emptyReason ?? "has_data"} models=${payload.availableModels.length}`,
    );

    return Response.json({ ...payload, requestId });
  } catch (e) {
    console.error("[llm-visibility] unhandled error:", e);
    return Response.json(
      {
        error: e instanceof Error ? e.message : "Failed to load LLM visibility",
        empty: true,
        chartData: [],
        brands: [],
        availableBrands: [],
        availableModels: [],
        byDate: [],
        byModel: {},
        prompts: [],
        promptPerformance: null,
        requestId,
      },
      { status: 500 },
    );
  }
}
