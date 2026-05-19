export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { llmVisibilityQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildLlmVisibilityDashboard,
  llmVisibilityBrandKey,
} from "@/lib/services/llm-visibility-dashboard";

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, llmVisibilityQuerySchema, requestId);
  if (!q.success) return q.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const { brandId, range, brandIds: brandIdsParam, models, promptIds, focusPromptId } = q.data;

  const userClient = await createServerSupabaseClient();
  const { data: userBrands } = await userClient
    .from("brands")
    .select("id, name")
    .eq("user_id", userId);

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
    requestedIds.length > 0 ? requestedIds.filter((id) => ownedIds.has(id)) : [brandId];

  const admin = tryCreateAdminSupabaseClient();
  const db = admin ?? userClient;
  const days = range === "90d" ? 90 : range === "30d" ? 30 : range === "14d" ? 14 : 7;
  const from = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: perfRows } = await db
    .from("llm_brand_performance")
    .select("brand_id, platform_id, prompt_id, visibility_score, rank_position, measured_at")
    .in("brand_id", selectedBrandIds)
    .gte("measured_at", from);

  const { data: platRows } = await db.from("llm_platforms").select("id, name, display_name");
  const { data: promptRows } = await db
    .from("prompts")
    .select("id, text")
    .eq("brand_id", brandId)
    .eq("is_active", true);

  const payload = buildLlmVisibilityDashboard({
    range,
    brandRows: availableBrands,
    perfRows: perfRows ?? [],
    platforms: (platRows ?? []) as Array<{ id: string; name: string; display_name: string }>,
    prompts: (promptRows ?? []).map((p) => ({ id: p.id as string, prompt: p.text as string })),
    selectedBrandIds,
    selectedModelSlugs: parseCsv(models),
    selectedPromptIds: parseCsv(promptIds),
    focusPromptId: focusPromptId ?? null,
  });

  const brandKeys = payload.brands.map((b) => llmVisibilityBrandKey(b.name));
  const brandLabels = payload.brands.map((b) => b.name);
  const header = ["date", ...brandLabels, ...brandLabels.map((n) => `${n} rank`)];
  const lines = [header.join(",")];
  for (const row of payload.byDate) {
    const date = row.date as string;
    const cols = [
      date,
      ...brandKeys.map((k) => String(row[k] ?? "")),
      ...brandKeys.map((k) => String(row[`${k}_rank`] ?? "")),
    ];
    lines.push(cols.join(","));
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="llm-visibility-${brandId}-${range}.csv"`,
    },
  });
}
