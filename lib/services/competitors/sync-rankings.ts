import { getAdminClient } from "@/lib/services/competitors/access";
import { normalizeDomain, searchSerperOrganic, type SerpOrganicResult } from "@/lib/services/competitors/serper-utils";

export async function syncCompetitorRankings(brandId: string) {
  const supabase = await getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: topQueries } = await supabase
    .from("gsc_query_rankings")
    .select("query, position, impressions")
    .eq("brand_id", brandId)
    .order("impressions", { ascending: false })
    .limit(20);

  const { data: competitors } = await supabase
    .from("brand_competitors")
    .select("id, competitor_domain")
    .eq("brand_id", brandId)
    .eq("is_active", true);

  if (!competitors?.length) {
    return { ranked: 0, reason: "No competitors configured — run detection first" };
  }

  const competitorDomains = new Set(competitors.map((c) => c.competitor_domain));
  const competitorIdByDomain = new Map(competitors.map((c) => [c.competitor_domain, c.id]));

  let totalRankings = 0;

  for (const q of topQueries ?? []) {
    let serpResults: SerpOrganicResult[] = [];

    const { data: snapshot } = await supabase
      .from("serp_snapshots")
      .select("raw_results")
      .eq("brand_id", brandId)
      .eq("query", q.query)
      .eq("snapshot_date", today)
      .maybeSingle();

    if (snapshot?.raw_results && Array.isArray(snapshot.raw_results)) {
      serpResults = snapshot.raw_results as SerpOrganicResult[];
    } else {
      try {
        serpResults = await searchSerperOrganic(q.query, 10);
        await supabase.from("serp_snapshots").upsert(
          {
            brand_id: brandId,
            query: q.query,
            snapshot_date: today,
            raw_results: serpResults,
            total_results: serpResults.length,
          },
          { onConflict: "brand_id,query,snapshot_date" },
        );
      } catch (err) {
        console.error(`[sync-rankings] fetch failed for "${q.query}":`, err);
        continue;
      }
    }

    const yourPos = Number(q.position ?? 100);

    for (const result of serpResults) {
      const domain = normalizeDomain(result.link);
      if (!competitorDomains.has(domain)) continue;

      const positionGap = Math.round(yourPos - result.position);

      const { error } = await supabase.from("competitor_rankings").upsert(
        {
          brand_id: brandId,
          competitor_id: competitorIdByDomain.get(domain) ?? null,
          competitor_domain: domain,
          query: q.query,
          position: result.position,
          page_url: result.link,
          page_title: result.title,
          page_snippet: result.snippet ?? null,
          snapshot_date: today,
          your_position: yourPos,
          position_gap: positionGap,
        },
        { onConflict: "brand_id,query,competitor_domain,snapshot_date" },
      );

      if (!error) totalRankings++;
    }
  }

  return { ranked: totalRankings };
}
