export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { runAllPromptsForBrand } from "@/lib/services/visibility-orchestrator";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const body = (await req.json()) as { brandId?: string };
    const brandId = body.brandId?.trim();
    console.log(`[/api/visibility/run] brandId=${brandId} userId=${userId}`);

    if (!brandId) {
      return Response.json(
        { error: "brandId required", success: false, completed: 0, failed: 0, requestId },
        { status: 400 },
      );
    }

    const userClient = await createServerSupabaseClient();
    const { data: owned } = await userClient
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!owned) {
      return Response.json(
        { error: "Brand not found or access denied", success: false, completed: 0, failed: 0, requestId },
        { status: 404 },
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: brand, error: brandErr } = await admin
      .from("brands")
      .select("id, name")
      .eq("id", brandId)
      .maybeSingle();

    if (brandErr || !brand) {
      console.error("[/api/visibility/run] admin brand lookup failed:", brandErr?.message);
      return Response.json(
        {
          error: brandErr?.message ?? `Brand not found: ${brandId}`,
          success: false,
          completed: 0,
          failed: 0,
          requestId,
        },
        { status: 404 },
      );
    }

    console.log(`[/api/visibility/run] Starting prompts for brand: ${brand.name}`);

    const result = await runAllPromptsForBrand(brandId, "manual", userId);
    const allFailed = (result.completed ?? 0) === 0 && (result.failed ?? 0) > 0;
    const analysesSaved = result.saveStats?.analysesSaved ?? 0;
    const responsesSaved = result.saveStats?.responsesSaved ?? 0;
    const modelFailures = result.saveStats?.failed ?? 0;
    const noAnalysis =
      analysesSaved === 0 && responsesSaved === 0
        ? modelFailures > 0 || (result.failed ?? 0) > 0
          ? "no_llm_keys"
          : "no_llm_responses"
        : analysesSaved === 0
          ? "analysis_insert_failed"
          : null;

    return Response.json({
      success: !allFailed && analysesSaved > 0,
      queued: false,
      ...result,
      warning:
        noAnalysis === "analysis_insert_failed"
          ? "LLM responses were saved but analysis could not be written. Use Re-analyze saved or check Supabase migrations."
          : noAnalysis === "no_llm_keys"
            ? "No LLM API keys configured. Add keys in Settings → API Keys or set OPENAI_API_KEY / ANTHROPIC_API_KEY on Vercel."
            : noAnalysis === "no_llm_responses"
              ? "No successful LLM responses in this run. Check Vercel logs for model errors."
              : undefined,
      requestId,
    });
  } catch (err) {
    console.error("[/api/visibility/run]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal error", requestId },
      { status: 500 },
    );
  }
}
