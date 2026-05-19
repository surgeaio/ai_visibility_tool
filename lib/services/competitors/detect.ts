import { getAdminClient } from "@/lib/services/competitors/access";
import {
  isUtilityDomain,
  normalizeDomain,
  searchSerperOrganic,
  type SerpOrganicResult,
} from "@/lib/services/competitors/serper-utils";

export async function detectCompetitors(brandId: string) {
  const supabase = await getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: brand } = await supabase.from("brands").select("id, name, website").eq("id", brandId).maybeSingle();

  if (!brand?.website) {
    throw new Error("Brand has no website set");
  }

  const brandDomain = normalizeDomain(brand.website);

  const { data: topQueries } = await supabase
    .from("gsc_query_rankings")
    .select("query, impressions, position")
    .eq("brand_id", brandId)
    .order("impressions", { ascending: false })
    .limit(20);

  if (!topQueries?.length) {
    return { detected: [], count: 0, reason: "No GSC queries to analyze" };
  }

  const domainFrequency = new Map<string, { count: number; positions: number[] }>();

  for (const q of topQueries.slice(0, 10)) {
    try {
      const serpResults = await fetchOrCacheSnapshot(supabase, brandId, q.query, today);

      for (const result of serpResults.slice(0, 10)) {
        const domain = normalizeDomain(result.link);
        if (domain === brandDomain || isUtilityDomain(domain)) continue;

        const existing = domainFrequency.get(domain) ?? { count: 0, positions: [] };
        existing.count++;
        existing.positions.push(result.position);
        domainFrequency.set(domain, existing);
      }
    } catch (err) {
      console.error(`[detect-competitors] failed for "${q.query}":`, err);
    }
  }

  const detected = Array.from(domainFrequency.entries())
    .map(([domain, data]) => {
      const avgPosition = data.positions.reduce((s, p) => s + p, 0) / data.positions.length;
      return {
        domain,
        appearances: data.count,
        avgPosition,
        score: data.count * (11 - Math.min(10, avgPosition)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const comp of detected) {
    await supabase.from("brand_competitors").upsert(
      {
        brand_id: brandId,
        competitor_domain: comp.domain,
        competitor_name: comp.domain.replace(/^www\./, "").split(".")[0],
        is_auto_detected: true,
        is_active: true,
        detection_score: comp.score,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "brand_id,competitor_domain" },
    );
  }

  return { detected, count: detected.length };
}

async function fetchOrCacheSnapshot(
  supabase: Awaited<ReturnType<typeof getAdminClient>>,
  brandId: string,
  query: string,
  today: string,
): Promise<SerpOrganicResult[]> {
  const { data: snapshot } = await supabase
    .from("serp_snapshots")
    .select("raw_results")
    .eq("brand_id", brandId)
    .eq("query", query)
    .eq("snapshot_date", today)
    .maybeSingle();

  if (snapshot?.raw_results && Array.isArray(snapshot.raw_results)) {
    return snapshot.raw_results as SerpOrganicResult[];
  }

  const serpResults = await searchSerperOrganic(query, 10);
  await supabase.from("serp_snapshots").upsert(
    {
      brand_id: brandId,
      query,
      snapshot_date: today,
      raw_results: serpResults,
      total_results: serpResults.length,
    },
    { onConflict: "brand_id,query,snapshot_date" },
  );
  return serpResults;
}
