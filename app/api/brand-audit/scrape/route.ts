export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getBrandQuerySet } from "@/lib/brand-audit/query-sets";
import { BrandAuditRepository } from "@/lib/repositories/brand-audit.repo";
import { brandAuditScrapeSchema } from "@/lib/validators/brand-audit.schema";
import {
  calculateContentScore,
  calculateOverallHealthScore,
  calculateSeoScore,
  calculateTechnicalScore,
} from "@/lib/utils/score-calculator";
import { scrapeWebsite } from "@/lib/services/website-scraper";

const repo = new BrandAuditRepository();

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const parsed = await validateBody(req, brandAuditScrapeSchema, requestId);
  if (!parsed.success) return parsed.response;

  try {
    const querySet = getBrandQuerySet(parsed.data.brandName ?? parsed.data.url);
    const brandName = parsed.data.brandName ?? querySet?.brandName ?? "Unknown";
    const audit = await scrapeWebsite(parsed.data.url);
    const seoScore = calculateSeoScore(audit);
    const technicalScore = calculateTechnicalScore(audit);
    const contentScore = calculateContentScore(audit);
    const overall = calculateOverallHealthScore({
      seoScore,
      technicalScore,
      llmVisibilityScore: 0,
    });

    const userId = await getAuthedUserId();
    const scrapeId = await repo.saveScrape({
      userId,
      brandName,
      url: audit.url,
      audit,
      seoScore,
      technicalScore,
      contentScore,
      overallScore: overall,
    });

    return Response.json({
      audit,
      scores: { seoScore, technicalScore, contentScore, overallScore: overall },
      scrapeId,
      saved: Boolean(scrapeId),
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Website scrape failed", requestId);
  }
}
