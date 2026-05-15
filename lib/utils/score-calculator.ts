import type { LlmVisibilityQueryResult, WebsiteAuditResult } from "@/lib/brand-audit/types";

export function calculateSeoScore(audit: WebsiteAuditResult): number {
  let score = 0;
  const title = audit.basic.title;
  if (title) score += 10;
  if (title.length >= 50 && title.length <= 60) score += 5;
  if (audit.basic.metaDescription) score += 10;
  const descLen = audit.basic.metaDescription.length;
  if (descLen >= 150 && descLen <= 160) score += 5;
  if (audit.seo.h1Count > 0) score += 10;
  if (audit.seo.h1Count === 1) score += 5;
  if (audit.seo.hasSchemaMarkup) score += 15;
  if (audit.seo.hasSitemap) score += 10;
  if (audit.seo.imageCount > 0 && audit.seo.imagesWithoutAlt === 0) score += 10;
  if (audit.technical.hasCanonical) score += 10;
  if (audit.seo.isIndexable) score += 10;
  return Math.min(100, score);
}

export function calculateTechnicalScore(audit: WebsiteAuditResult): number {
  let score = 0;
  if (audit.technical.isHttps) score += 20;
  if (audit.technical.hasViewportMeta) score += 15;
  const rt = audit.technical.responseTimeMs;
  if (rt < 1000) score += 20;
  else if (rt < 2000) score += 10;
  else if (rt < 3000) score += 5;
  if (audit.technical.hasGoogleAnalytics || audit.technical.hasGTM) score += 15;
  if (!audit.error) score += 15;
  if (audit.social.hasOpenGraph) score += 15;
  return Math.min(100, score);
}

export function calculateContentScore(audit: WebsiteAuditResult): number {
  let score = 0;
  if (audit.seo.wordCount > 300) score += 25;
  else if (audit.seo.wordCount > 150) score += 15;
  if (audit.content.hasContactInfo) score += 20;
  if (audit.content.hasBlogSection) score += 15;
  if (audit.content.hasPricingPage) score += 15;
  if (audit.content.ctaTexts.length > 0) score += 15;
  if (audit.content.mainKeywords.length >= 3) score += 10;
  return Math.min(100, score);
}

export function calculateQueryVisibilityScore(result: Omit<LlmVisibilityQueryResult, "visibilityScore" | "queriedAt">): number {
  if (!result.brandMentioned) return 0;
  let score = 10;
  if (result.mentionPosition === 1) score += 3;
  else if (result.mentionPosition === 2) score += 2;
  else if (result.mentionPosition === 3) score += 1;
  if (result.sentiment === "positive") score += 2;
  if (result.sentiment === "negative") score -= 5;
  return Math.max(0, Math.min(15, score));
}

export function calculateLlmVisibilityScore(results: LlmVisibilityQueryResult[]): number {
  if (results.length === 0) return 0;
  const maxPerQuery = 15;
  const total = results.reduce((sum, r) => sum + calculateQueryVisibilityScore(r), 0);
  const normalized = (total / (results.length * maxPerQuery)) * 100;
  return Math.round(Math.min(100, Math.max(0, normalized)));
}

export function calculateOverallHealthScore(scores: {
  seoScore: number;
  technicalScore: number;
  llmVisibilityScore: number;
}): number {
  return Math.round(scores.seoScore * 0.3 + scores.technicalScore * 0.2 + scores.llmVisibilityScore * 0.5);
}

export function generateRecommendations(
  audit: WebsiteAuditResult | null,
  llmResults: LlmVisibilityQueryResult[],
  brandName: string,
): string[] {
  const recs: string[] = [];
  if (audit) {
    if (!audit.seo.hasSchemaMarkup) {
      recs.push("Add FAQ or Organization schema markup to improve AI visibility and rich results.");
    }
    if (!audit.basic.metaDescription) {
      recs.push("Add a meta description with primary keywords for your category.");
    }
    if (audit.seo.h1Count !== 1) {
      recs.push(`Use exactly one H1 per page (found ${audit.seo.h1Count}).`);
    }
    if (audit.seo.imagesWithoutAlt > 0) {
      recs.push(`${audit.seo.imagesWithoutAlt} images missing alt text — add descriptive alt attributes.`);
    }
    if (!audit.seo.hasSitemap) {
      recs.push("Publish and submit a sitemap.xml to search engines.");
    }
    if (audit.technical.responseTimeMs > 2000) {
      recs.push(`Page response time is ${(audit.technical.responseTimeMs / 1000).toFixed(1)}s — optimize images and caching.`);
    }
  }
  const categoryQueries = llmResults.filter((r) => r.queryCategory === "category");
  const mentionedInCategory = categoryQueries.filter((r) => r.brandMentioned).length;
  if (categoryQueries.length > 0 && mentionedInCategory / categoryQueries.length < 0.3) {
    recs.push(
      `${brandName} was mentioned in only ${mentionedInCategory}/${categoryQueries.length} category queries — invest in comparison and thought-leadership content.`,
    );
  }
  const notMentioned = llmResults.filter((r) => !r.brandMentioned && r.queryCategory === "direct").length;
  if (notMentioned > 0) {
    recs.push(`${notMentioned} direct brand queries had no mention — strengthen branded content and third-party citations.`);
  }
  if (recs.length === 0) {
    recs.push("Strong baseline — continue monitoring LLM visibility monthly and expand category-query content.");
  }
  return recs;
}
