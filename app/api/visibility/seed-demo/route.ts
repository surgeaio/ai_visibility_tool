/**
 * POST /api/visibility/seed-demo   — seed demo analytics for a brand
 * GET  /api/visibility/seed-demo   — diagnostic: return row counts per table
 */
export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { seedDemoDataForBrand, brandHasData } from "@/lib/services/demo-data-seeder";

export const maxDuration = 120;

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const userId = await getAuthedUserId();
    if (!userId) return Response.json({ error: "Unauthorized", requestId }, { status: 401 });

    const body = (await req.json()) as { brandId?: string };
    const brandId = body.brandId?.trim();
    if (!brandId) return Response.json({ error: "brandId required", requestId }, { status: 400 });

    const userClient = await createServerSupabaseClient();
    const { data: brand } = await userClient
      .from("brands")
      .select("id, name, domain")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!brand) return Response.json({ error: "Brand not found or access denied", requestId }, { status: 404 });

    const hasData = await brandHasData(brandId);
    if (hasData) {
      return Response.json({ seeded: false, message: "Brand already has data. Demo seed was not applied.", requestId });
    }

    const result = await seedDemoDataForBrand({
      brandId,
      brandName: brand.name as string,
      domain: brand.domain as string | null,
    });

    return Response.json({ ...result, requestId });
  } catch (err) {
    console.error("[/api/visibility/seed-demo]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Seed failed", requestId }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) return Response.json({ error: "brandId required", requestId }, { status: 400 });

  const userId = await getAuthedUserId();
  if (!userId) return Response.json({ error: "Unauthorized", requestId }, { status: 401 });

  try {
    const admin = createAdminSupabaseClient();

    const [resp, ana, metrics, recs, comps, sources, prompts] = await Promise.all([
      admin.from("chat_responses").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("chat_analysis").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("brand_daily_metrics").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("ai_recommendations").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("competitors").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("source_appearances").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("prompts").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
    ]);

    const counts = {
      chat_responses:      resp.count    ?? 0,
      chat_analysis:       ana.count     ?? 0,
      brand_daily_metrics: metrics.count ?? 0,
      ai_recommendations:  recs.count    ?? 0,
      competitors:         comps.count   ?? 0,
      source_appearances:  sources.count ?? 0,
      prompts:             prompts.count ?? 0,
    };

    return Response.json({
      hasData: counts.chat_responses >= 10,
      counts,
      requestId,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Diagnostic failed", requestId }, { status: 500 });
  }
}
