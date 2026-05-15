import { getBrandQuerySet } from "@/lib/brand-audit/query-sets";
import { getSampleReport } from "@/lib/brand-audit/sample-data";
import type { BrandAuditReport } from "@/lib/brand-audit/types";
import { BrandAuditRepository } from "@/lib/repositories/brand-audit.repo";
import {
  calculateContentScore,
  calculateLlmVisibilityScore,
  calculateOverallHealthScore,
  calculateSeoScore,
  calculateTechnicalScore,
  generateRecommendations,
} from "@/lib/utils/score-calculator";
import { runLlmVisibilityAnalysis } from "@/lib/services/llm-visibility-analyzer";
import { scrapeWebsite } from "@/lib/services/website-scraper";

const CACHE_MS = 24 * 60 * 60 * 1000;
const repo = new BrandAuditRepository();

export async function buildFullBrandReport(input: {
  brand: string;
  url?: string;
  userId: string | null;
  runLlm?: boolean;
  maxLlmQueries?: number;
}): Promise<BrandAuditReport & { saved: boolean; scrapeId: string | null; reportId: string | null }> {
  const querySet = getBrandQuerySet(input.brand);
  const brandName = querySet?.brandName ?? input.brand;
  const brandUrl = input.url ?? querySet?.brandUrl ?? "";

  const websiteAudit = brandUrl ? await scrapeWebsite(brandUrl) : null;
  const seoScore = websiteAudit ? calculateSeoScore(websiteAudit) : 0;
  const technicalScore = websiteAudit ? calculateTechnicalScore(websiteAudit) : 0;
  const contentScore = websiteAudit ? calculateContentScore(websiteAudit) : 0;

  let llmResults: BrandAuditReport["llmResults"] = [];
  const llmErrors: string[] = [];

  if (input.runLlm !== false && querySet) {
    const { results, errors } = await runLlmVisibilityAnalysis(querySet, {
      maxQueries: input.maxLlmQueries ?? 6,
    });
    llmResults = results;
    llmErrors.push(...errors);
  }

  const llmVisibilityScore = calculateLlmVisibilityScore(llmResults);
  const overallHealthScore = calculateOverallHealthScore({
    seoScore,
    technicalScore,
    llmVisibilityScore,
  });

  const competitorsFound = [
    ...new Set(llmResults.flatMap((r) => r.competitorsMentioned)),
  ];

  const report: BrandAuditReport = {
    brandName,
    brandUrl,
    isSampleData: false,
    generatedAt: new Date().toISOString(),
    websiteAudit,
    scores: {
      seoScore,
      technicalScore,
      contentScore,
      llmVisibilityScore,
      overallHealthScore,
    },
    llmResults,
    competitorsFound,
    recommendations: generateRecommendations(websiteAudit, llmResults, brandName),
  };

  if (llmErrors.length > 0 && llmResults.length === 0) {
    report.recommendations.unshift(
      `LLM analysis partial: ${llmErrors[0] ?? "Configure API keys in Settings."}`,
    );
  }

  let scrapeId: string | null = null;
  if (websiteAudit) {
    scrapeId = await repo.saveScrape({
      userId: input.userId,
      brandName,
      url: brandUrl,
      audit: websiteAudit,
      seoScore,
      technicalScore,
      contentScore,
      overallScore: overallHealthScore,
    });
  }
  await repo.saveLlmResults(input.userId, llmResults);
  const reportId = await repo.saveReport({
    userId: input.userId,
    report,
    websiteAuditId: scrapeId,
  });

  return {
    ...report,
    saved: Boolean(reportId),
    scrapeId,
    reportId,
  };
}

export async function getCachedOrSampleReport(brandKey: string): Promise<BrandAuditReport> {
  const querySet = getBrandQuerySet(brandKey);
  const brandName = querySet?.brandName ?? brandKey;
  try {
    const latest = await repo.getLatestReport(brandName);
    if (latest && !latest.isSampleData) {
      const age = Date.now() - new Date(latest.generatedAt).getTime();
      if (age < CACHE_MS) return latest;
    }
  } catch {
    /* DB tables may not exist yet — fall back to sample */
  }
  const sample = getSampleReport(brandKey);
  if (sample) return sample;
  return getSampleReport("shifthub")!;
}

export { CACHE_MS };
