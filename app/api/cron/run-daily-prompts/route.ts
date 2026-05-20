export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/auth";
import { getRequestId } from "@/lib/api/validate";
import { runAllPromptsForBrand } from "@/lib/services/visibility-orchestrator";
import { generateVisibilityRecommendationsForBrand } from "@/lib/services/visibility-recommendations-engine";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  if (!authorizeCron(req)) {
    console.error("[cron/run-daily-prompts] Unauthorized");
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Missing Supabase env vars", requestId }, { status: 500 });
  }

  try {
    const { data: brands, error: brandsErr } = await admin.from("brands").select("id, name");
    if (brandsErr || !brands) {
      throw new Error(`Failed to fetch brands: ${brandsErr?.message}`);
    }

    console.log(`[cron/run-daily-prompts] ${brands.length} brands`);
    const results: Array<Record<string, unknown>> = [];

    for (const brand of brands) {
      try {
        const { count } = await admin
          .from("prompts")
          .select("id", { count: "exact", head: true })
          .eq("brand_id", brand.id)
          .eq("is_active", true);

        if (!count || count === 0) {
          console.log(`[cron/run-daily-prompts] skip ${brand.name} — no active prompts`);
          continue;
        }

        const result = await runAllPromptsForBrand(brand.id as string, "scheduled");
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          completed: result.completed,
          failed: result.failed,
        });
        console.log(
          `[cron/run-daily-prompts] ${brand.name}: ${result.completed} ok, ${result.failed} failed`,
        );
      } catch (err) {
        console.error(`[cron/run-daily-prompts] brand ${brand.id} failed`, err);
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    for (const brand of brands) {
      try {
        await generateVisibilityRecommendationsForBrand(brand.id as string);
      } catch (err) {
        console.error(`[cron/run-daily-prompts] recommendations ${brand.id}`, err);
      }
    }

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      brandsProcessed: results.length,
      results,
      requestId,
    });
  } catch (err) {
    console.error("[cron/run-daily-prompts] fatal", err);
    return NextResponse.json(
      {
        error: "Cron job failed",
        message: err instanceof Error ? err.message : "Unknown",
        requestId,
      },
      { status: 500 },
    );
  }
}
