export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureBrandHasDemoData } from "@/lib/services/demo-data-seeder";

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
    .select("id, name, domain")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!brand) {
    return Response.json({ error: "Brand not found", requestId }, { status: 404 });
  }

  // Auto-seed demo data (non-blocking)
  await ensureBrandHasDemoData(brandId, brand.name as string, brand.domain as string | null);

  const admin = tryCreateAdminSupabaseClient();
  const db = admin ?? userClient;

  const { data: mentions } = await db
    .from("chat_analysis")
    .select(
      "ai_model, brand_sentiment, brand_sentiment_label, brand_mention_context, run_date, prompt_id",
    )
    .eq("brand_id", brandId)
    .eq("brand_mentioned", true)
    .order("run_date", { ascending: false })
    .limit(50);

  const all = mentions ?? [];
  const positive = all.filter((m) => m.brand_sentiment_label === "positive");
  const neutral = all.filter((m) => m.brand_sentiment_label === "neutral");
  const negative = all.filter((m) => m.brand_sentiment_label === "negative");

  const avgScore = all.length
    ? Math.round(
        all.reduce((s, m) => s + Number(m.brand_sentiment ?? 0), 0) / all.length,
      )
    : null;

  return Response.json({
    brandName: brand.name,
    summary: {
      total: all.length,
      positive: positive.length,
      neutral: neutral.length,
      negative: negative.length,
      avgScore,
    },
    positiveQuotes: positive.slice(0, 10),
    neutralQuotes: neutral.slice(0, 10),
    negativeQuotes: negative.slice(0, 10),
    requestId,
  });
}
