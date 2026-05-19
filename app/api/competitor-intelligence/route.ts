import { NextRequest } from "next/server";
import { hasAdminSupabaseEnv, missingSupabaseResponse } from "@/lib/api/supabase-env";
import { getAuthedUserId } from "@/lib/api/session";
import { verifyBrandOwnedByUser, getAdminClient } from "@/lib/services/competitors/access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasAdminSupabaseEnv()) return missingSupabaseResponse();

  const userId = await getAuthedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const brandId = new URL(req.url).searchParams.get("brandId");
  if (!brandId) return Response.json({ error: "brandId required" }, { status: 400 });

  const brand = await verifyBrandOwnedByUser(brandId, userId);
  if (!brand) return Response.json({ error: "Brand not found" }, { status: 404 });

  try {
    const supabase = await getAdminClient();
    if (!supabase) return missingSupabaseResponse();

    const { data: gscSummary } = await supabase
      .from("gsc_daily_metrics")
      .select("clicks, impressions, avg_position")
      .eq("brand_id", brandId)
      .order("metric_date", { ascending: false })
      .limit(30);

    const totalClicks = (gscSummary ?? []).reduce((s, d) => s + (d.clicks ?? 0), 0);
    const totalImpressions = (gscSummary ?? []).reduce((s, d) => s + (d.impressions ?? 0), 0);
    const avgPosition =
      (gscSummary ?? []).length > 0
        ? (gscSummary ?? []).reduce((s, d) => s + Number(d.avg_position ?? 0), 0) / gscSummary!.length
        : 0;

    const { data: topQueries } = await supabase
      .from("gsc_query_rankings")
      .select("query, position, clicks")
      .eq("brand_id", brandId)
      .order("clicks", { ascending: false })
      .limit(5);

    const { data: competitors } = await supabase
      .from("brand_competitors")
      .select("*")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("detection_score", { ascending: false });

    const { data: topGaps } = await supabase
      .from("competitor_rankings")
      .select("*")
      .eq("brand_id", brandId)
      .order("position_gap", { ascending: false })
      .limit(10);

    const { data: analyses } = await supabase
      .from("competitor_analysis")
      .select("*")
      .eq("brand_id", brandId)
      .eq("analysis_type", "why_they_win")
      .order("created_at", { ascending: false })
      .limit(3);

    type ActionItem = { priority?: string; action?: string; expected_impact?: string; competitor?: string };

    const allActionItems: ActionItem[] = (analyses ?? []).flatMap((a) => {
      const items = (a.action_items ?? []) as ActionItem[];
      return items.map((item) => ({
        ...item,
        competitor: a.competitor_domain,
      }));
    });

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    allActionItems.sort(
      (a, b) => (priorityOrder[a.priority ?? ""] ?? 99) - (priorityOrder[b.priority ?? ""] ?? 99),
    );

    return Response.json({
      summary: {
        totalClicks,
        totalImpressions,
        avgPosition: Math.round(avgPosition * 10) / 10,
        ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        topQueries: topQueries ?? [],
      },
      competitors: competitors ?? [],
      topGaps: topGaps ?? [],
      analyses: analyses ?? [],
      actionItems: allActionItems.slice(0, 8),
      hasAnalysis: (analyses ?? []).length > 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load competitor data";
    console.error("[competitor-intelligence] GET failed:", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
