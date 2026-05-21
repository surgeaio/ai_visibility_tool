/**
 * POST /api/visibility/seed-demo
 *   Body: { brandId: string, force?: boolean }
 *   Seeds demo analytics. force=true cleans existing data and re-seeds.
 *
 * GET  /api/visibility/seed-demo?brandId=...
 *   Returns row counts across all 7 tables (diagnostic).
 */
export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  seedDemoDataForBrand,
  brandHasData,
  isSifthubBrand,
} from "@/lib/services/demo-data-seeder";

export const maxDuration = 120;

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const userId = await getAuthedUserId();
    if (!userId) return Response.json({ error: "Unauthorized", requestId }, { status: 401 });

    const body = (await req.json()) as { brandId?: string; force?: boolean };
    const brandId = body.brandId?.trim();
    const force = Boolean(body.force);

    if (!brandId) return Response.json({ error: "brandId required", requestId }, { status: 400 });

    // Verify ownership
    const userClient = await createServerSupabaseClient();
    const { data: brand } = await userClient
      .from("brands")
      .select("id, name, domain")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!brand) return Response.json({ error: "Brand not found or access denied", requestId }, { status: 404 });

    const brandName = brand.name as string;
    const domain = brand.domain as string | null;

    // Safety check: never force-seed a brand with >200 responses (likely real data)
    if (force) {
      const admin = createAdminSupabaseClient();
      const { count } = await admin
        .from("chat_responses")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId);
      if ((count ?? 0) > 200) {
        return Response.json({
          error: "force=true refused — brand has more than 200 chat_responses. This looks like real customer data. Delete manually if you are sure.",
          count,
          requestId,
        }, { status: 409 });
      }
    }

    if (!force) {
      const hasData = await brandHasData(brandId);
      const isSifthub = isSifthubBrand({ name: brandName, domain });
      // For sifthub, also check if specific prompts are already seeded
      if (hasData && !isSifthub) {
        return Response.json({ seeded: false, message: "Brand already has data. Use force=true to re-seed.", requestId });
      }
    }

    const result = await seedDemoDataForBrand({
      brandId,
      brandName,
      domain,
      force,
    });

    return Response.json({ ...result, requestId });
  } catch (err) {
    console.error("[/api/visibility/seed-demo POST]", err);
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

    const [resp, ana, metrics, recs, comps, sources, prompts, cits] = await Promise.all([
      admin.from("chat_responses").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("chat_analysis").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("brand_daily_metrics").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("ai_recommendations").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("competitors").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("source_appearances").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("prompts").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
      admin.from("citations").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
    ]);

    // Check if sifthub-specific prompt exists
    const { count: rfpCount } = await admin
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId)
      .eq("text", "best rfp automation tools");

    const counts = {
      chat_responses:      resp.count    ?? 0,
      chat_analysis:       ana.count     ?? 0,
      brand_daily_metrics: metrics.count ?? 0,
      ai_recommendations:  recs.count    ?? 0,
      competitors:         comps.count   ?? 0,
      source_appearances:  sources.count ?? 0,
      prompts:             prompts.count ?? 0,
      citations:           cits.count    ?? 0,
    };

    return Response.json({
      hasData: counts.chat_responses >= 10,
      sifthubSpecificDataPresent: (rfpCount ?? 0) > 0,
      counts,
      expected: {
        sifthub: { prompts: 28, chat_responses: 56, chat_analysis: 56, brand_daily_metrics: 21, competitors: 4, ai_recommendations: 5, citations: 16 },
        selldo:  { prompts: 15, chat_responses: 60, chat_analysis: 60, brand_daily_metrics: 150, competitors: 3, ai_recommendations: 6, citations: 19 },
      },
      requestId,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Diagnostic failed", requestId }, { status: 500 });
  }
}
