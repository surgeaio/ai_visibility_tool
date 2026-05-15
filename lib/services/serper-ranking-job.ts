import { CompetitorsRepository } from "@/lib/repositories/competitors.repo";
import { PromptsRepository } from "@/lib/repositories/prompts.repo";
import { BrandsRepository } from "@/lib/repositories/brands.repo";
import type { SerperRankingJobData } from "@/lib/queues/types";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  findBestOrganicRank,
  normalizeHost,
  serperSearch,
  summarizeSerpFeatures,
  type SerperSearchResponse,
} from "@/lib/services/serper";

const SERPER_COUNTRY = "serper";

function slugTarget(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export interface SerperRankingJobResult {
  rowsWritten: number;
  keywordsChecked: number;
  matches: { keyword: string; target: string; url: string; position: number }[];
  errors: string[];
}

type CompetitorDbRow = {
  competitor_name: string;
  domain: string | null;
  website: string | null;
};

export async function executeSerperRankingJob(data: SerperRankingJobData): Promise<SerperRankingJobResult> {
  const errors: string[] = [];
  const matches: SerperRankingJobResult["matches"] = [];
  let rowsWritten = 0;

  const brandsRepo = new BrandsRepository();
  const promptsRepo = new PromptsRepository();

  const brand = await brandsRepo.findById(data.brandId);
  if (!brand) {
    return { rowsWritten: 0, keywordsChecked: 0, matches, errors: ["brand_not_found"] };
  }

  const brandHost = normalizeHost(brand.domain ?? brand.website);
  if (!brandHost) {
    return { rowsWritten: 0, keywordsChecked: 0, matches, errors: ["brand_domain_missing"] };
  }

  let keywords = data.keywords?.length ? [...data.keywords] : [];
  if (!keywords.length) {
    const { items } = await promptsRepo.findManyByBrand(data.brandId, {
      pagination: { limit: 15, offset: 0 },
      filters: { is_active: true },
    });
    keywords = items.map((p) => p.text).filter(Boolean);
  }
  if (!keywords.length) {
    keywords = [brand.name];
  }

  const targets: { label: string; host: string; device: string }[] = [
    { label: brand.name, host: brandHost, device: "serper:brand" },
  ];

  const admin = tryCreateAdminSupabaseClient();

  if (data.includeCompetitors !== false) {
    if (admin) {
      const { data: compRows, error: compErr } = await admin
        .from("competitors")
        .select("competitor_name, domain, website")
        .eq("brand_id", data.brandId);
      if (compErr) {
        errors.push(`competitors_load: ${compErr.message}`);
      } else {
        for (const c of (compRows ?? []) as CompetitorDbRow[]) {
          const h = normalizeHost(c.domain ?? c.website);
          if (h) {
            targets.push({
              label: c.competitor_name,
              host: h,
              device: `serper:comp:${slugTarget(c.competitor_name)}`,
            });
          }
        }
      }
    } else {
      const { items: comps } = await new CompetitorsRepository().findManyByBrand(data.brandId, {
        pagination: { limit: 20, offset: 0 },
      });
      for (const c of comps) {
        const h = normalizeHost(c.name.includes(".") ? c.name : null);
        if (h) {
          targets.push({
            label: c.name,
            host: h,
            device: `serper:comp:${slugTarget(c.name)}`,
          });
        }
      }
    }
  }

  const measuredDate = new Date().toISOString().slice(0, 10);
  const gl = data.gl;
  const hl = data.hl;

  for (const keyword of keywords) {
    let payload: SerperSearchResponse;
    try {
      payload = await serperSearch({ q: keyword, num: 20, gl, hl });
    } catch (e) {
      errors.push(`${keyword}: ${e instanceof Error ? e.message : "serper_error"}`);
      continue;
    }

    const serpSummary = summarizeSerpFeatures(payload);
    const serpFeatures = {
      ...serpSummary,
      query: keyword,
      checkedAt: new Date().toISOString(),
    };

    const organic = payload.organic;

    for (const t of targets) {
      const hit = findBestOrganicRank(organic, t.host);
      if (!hit) continue;
      matches.push({ keyword, target: t.label, url: hit.url, position: hit.position });

      if (!admin) continue;

      const { error } = await admin.from("google_rankings").upsert(
        {
          brand_id: data.brandId,
          keyword,
          url: hit.url,
          position: hit.position,
          impressions: null,
          clicks: null,
          ctr: null,
          click_through_rate: null,
          country: SERPER_COUNTRY,
          device: t.device,
          measured_date: measuredDate,
          serp_features: serpFeatures,
        },
        { onConflict: "brand_id,keyword,url,country,device,measured_date" },
      );
      if (error) {
        errors.push(`${keyword} / ${t.label}: ${error.message}`);
      } else {
        rowsWritten += 1;
      }
    }
  }

  return {
    rowsWritten,
    keywordsChecked: keywords.length,
    matches,
    errors,
  };
}
