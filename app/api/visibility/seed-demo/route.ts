/**
 * POST /api/visibility/seed-demo
 *
 * Seed realistic demo analytics for a brand that has no data.
 * Idempotent — safe to call multiple times; does nothing if real data exists.
 */
export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { seedDemoDataForBrand, brandHasData } from "@/lib/services/demo-data-seeder";

export const maxDuration = 60;

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const body = (await req.json()) as { brandId?: string };
    const brandId = body.brandId?.trim();
    if (!brandId) {
      return Response.json({ error: "brandId required", requestId }, { status: 400 });
    }

    // Verify brand ownership
    const userClient = await createServerSupabaseClient();
    const { data: brand } = await userClient
      .from("brands")
      .select("id, name, domain")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!brand) {
      return Response.json({ error: "Brand not found or access denied", requestId }, { status: 404 });
    }

    const hasData = await brandHasData(brandId);
    if (hasData) {
      return Response.json({
        seeded: false,
        message: "Brand already has data. Demo seed was not applied.",
        requestId,
      });
    }

    const result = await seedDemoDataForBrand({
      brandId,
      brandName: brand.name as string,
      domain: brand.domain as string | null,
    });

    return Response.json({ ...result, requestId });
  } catch (err) {
    console.error("[/api/visibility/seed-demo]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Seed failed", requestId },
      { status: 500 },
    );
  }
}

/**
 * GET /api/visibility/seed-demo?brandId=...
 * Check if a brand has data (diagnostic endpoint).
 */
export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) {
    return Response.json({ error: "brandId required", requestId }, { status: 400 });
  }

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const { count: responses } = await admin
      .from("chat_responses")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    const { count: analyses } = await admin
      .from("chat_analysis")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    const { count: metrics } = await admin
      .from("brand_daily_metrics")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    const { count: recs } = await admin
      .from("ai_recommendations")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    return Response.json({
      hasData: (responses ?? 0) > 0,
      counts: {
        chat_responses: responses ?? 0,
        chat_analysis: analyses ?? 0,
        brand_daily_metrics: metrics ?? 0,
        ai_recommendations: recs ?? 0,
      },
      requestId,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Diagnostic failed", requestId },
      { status: 500 },
    );
  }
}
