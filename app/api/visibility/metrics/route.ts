export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");
  const range = parseInt(searchParams.get("range") || "30", 10);

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

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);

  const { data: metrics, error } = await db
    .from("brand_daily_metrics")
    .select("*")
    .eq("brand_id", brandId)
    .gte("metric_date", startDate.toISOString().slice(0, 10))
    .lte("metric_date", endDate.toISOString().slice(0, 10))
    .order("metric_date", { ascending: true });

  if (error) {
    return Response.json({ error: error.message, requestId }, { status: 500 });
  }
  return Response.json({ metrics: metrics ?? [], requestId });
}
