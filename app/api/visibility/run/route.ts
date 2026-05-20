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
    const noDataSaved = (result.saveStats?.analysesSaved ?? 0) === 0;

    return Response.json({
      success: !allFailed && !noDataSaved,
      queued: false,
      ...result,
      warning: noDataSaved
        ? "Prompts ran but no analysis rows were saved. Check Vercel logs for [visibility-persist] errors or apply visibility migrations in Supabase."
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
