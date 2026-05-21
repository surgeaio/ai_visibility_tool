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

  const { data: prompts } = await db
    .from("prompts")
    .select("id, text, category, created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (!prompts?.length) {
    return Response.json({ prompts: [], requestId });
  }

  const results = await Promise.all(
    prompts.map(async (p) => {
      const { data: analyses } = await db
        .from("chat_analysis")
        .select("brand_mentioned, brand_sentiment, run_date")
        .eq("prompt_id", p.id)
        .order("run_date", { ascending: false })
        .limit(20);

      if (!analyses?.length) {
        return {
          id: p.id,
          text: p.text,
          category: p.category,
          created_at: p.created_at,
          last_run: null,
          visibility_pct: null,
          avg_sentiment: null,
        };
      }

      const latestDate = analyses[0].run_date as string;
      const latestRuns = analyses.filter((a) => a.run_date === latestDate);
      const mentioned = latestRuns.filter((a) => a.brand_mentioned).length;
      const visibility = (mentioned / latestRuns.length) * 100;
      const sents = latestRuns
        .map((a) => a.brand_sentiment)
        .filter((s): s is number => s != null);
      const avgSent = sents.length
        ? sents.reduce((a, b) => a + b, 0) / sents.length
        : null;

      return {
        id: p.id,
        text: p.text,
        category: p.category,
        created_at: p.created_at,
        last_run: latestDate,
        visibility_pct: Math.round(visibility),
        avg_sentiment: avgSent != null ? Math.round(avgSent) : null,
      };
    }),
  );

  return Response.json({ prompts: results, requestId });
}
