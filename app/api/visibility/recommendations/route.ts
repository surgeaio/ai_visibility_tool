export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { generateVisibilityRecommendationsForBrand } from "@/lib/services/visibility-recommendations-engine";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 120;

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

  const userClient = await createServerSupabaseClient();
  const { data: brand } = await userClient
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!brand) {
    return Response.json({ error: "Brand not found", requestId }, { status: 404 });
  }

  const admin = tryCreateAdminSupabaseClient();
  const db = admin ?? userClient;

  const { data, error } = await db
    .from("ai_recommendations")
    .select("*")
    .eq("brand_id", brandId)
    .in("status", ["open", "in_progress"])
    .order("priority", { ascending: false })
    .order("impact_score", { ascending: false });

  if (error) {
    return Response.json({ error: error.message, requestId }, { status: 500 });
  }

  return Response.json({ recommendations: data ?? [], requestId });
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const body = (await req.json()) as { brandId?: string };
    const brandId = body.brandId;
    if (!brandId) {
      return Response.json({ error: "brandId required", requestId }, { status: 400 });
    }

    const userClient = await createServerSupabaseClient();
    const { data: brand } = await userClient
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!brand) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const result = await generateVisibilityRecommendationsForBrand(brandId);
    return Response.json({ success: true, ...result, requestId });
  } catch (err) {
    console.error("[/api/visibility/recommendations]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate", requestId },
      { status: 500 },
    );
  }
}
