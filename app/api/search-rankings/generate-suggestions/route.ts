export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId } from "@/lib/api/validate";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { NextRequest } from "next/server";

type SuggestionInsert = Database["public"]["Tables"]["gsc_improvement_suggestions"]["Insert"];

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const { brandId } = (await req.json().catch(() => ({}))) as { brandId?: string };
  if (!brandId) {
    return Response.json({ error: "brandId required", requestId }, { status: 400 });
  }

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    return Response.json({ error: "Database not configured", requestId }, { status: 503 });
  }

  const startDate = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const { data: rankings } = await admin
    .from("gsc_query_rankings")
    .select("*")
    .eq("brand_id", brandId)
    .gte("metric_date", startDate)
    .order("impressions", { ascending: false })
    .limit(200);

  if (!rankings?.length) {
    return Response.json({ message: "No ranking data to analyze", suggestions: [], requestId });
  }

  const suggestions: SuggestionInsert[] = [];

  rankings
    .filter((r) => Number(r.position) <= 10 && Number(r.ctr) < 0.03 && (r.impressions ?? 0) > 100)
    .slice(0, 10)
    .forEach((r) => {
      suggestions.push({
        brand_id: brandId,
        query: r.query,
        page_url: r.page_url,
        suggestion_type: "low_ctr",
        priority: "high",
        title: `Low CTR for "${r.query}" (position ${Number(r.position).toFixed(1)})`,
        description: `Your page ranks well but only ${(Number(r.ctr) * 100).toFixed(2)}% of searchers click. Improve title and meta description.`,
        action_items: [
          "Rewrite the page title to directly answer the query",
          "Update the meta description with a clear benefit or CTA",
          "Add the exact query phrase near the top of the page",
          "Consider FAQ or HowTo schema for rich snippets",
        ],
        metric_snapshot: {
          position: r.position,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
        },
      });
    });

  rankings
    .filter((r) => Number(r.position) > 10 && Number(r.position) <= 20 && (r.impressions ?? 0) > 200)
    .slice(0, 10)
    .forEach((r) => {
      suggestions.push({
        brand_id: brandId,
        query: r.query,
        page_url: r.page_url,
        suggestion_type: "new_opportunity",
        priority: "high",
        title: `One step from page 1: "${r.query}"`,
        description: `Position ${Number(r.position).toFixed(1)} for ${r.impressions} monthly impressions. Moving to page 1 could significantly increase traffic.`,
        action_items: [
          "Expand content depth (aim for comprehensive coverage)",
          "Add internal links from other ranking pages",
          "Earn 1–2 relevant backlinks to this URL",
          "Refresh with current-year data and examples",
        ],
        metric_snapshot: {
          position: r.position,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
        },
      });
    });

  rankings
    .filter((r) => Number(r.position) > 20 && Number(r.position) <= 50 && (r.impressions ?? 0) > 500)
    .slice(0, 5)
    .forEach((r) => {
      suggestions.push({
        brand_id: brandId,
        query: r.query,
        page_url: r.page_url,
        suggestion_type: "content_gap",
        priority: "medium",
        title: `Untapped potential: "${r.query}"`,
        description: `High search volume (${r.impressions} impressions) at position ${Number(r.position).toFixed(1)}. A stronger dedicated page could win this query.`,
        action_items: [
          "Create or expand a landing page targeting this query",
          "Analyze top 3 ranking pages and exceed their depth",
          "Add unique media (video, infographic) competitors lack",
          "Build a content cluster around this topic",
        ],
        metric_snapshot: {
          position: r.position,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: r.ctr,
        },
      });
    });

  if (suggestions.length > 0) {
    await admin.from("gsc_improvement_suggestions").delete().eq("brand_id", brandId).eq("status", "open");
    await admin.from("gsc_improvement_suggestions").insert(suggestions);
  }

  return Response.json({ generated: suggestions.length, suggestions, requestId });
}
