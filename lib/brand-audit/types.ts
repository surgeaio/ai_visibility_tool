export interface WebsiteAuditResult {
  url: string;
  scrapedAt: string;
  error?: string;
  basic: {
    title: string;
    metaDescription: string;
    metaKeywords: string[];
    canonical: string;
    lang: string;
  };
  seo: {
    h1Count: number;
    h1Text: string[];
    h2Count: number;
    h2Text: string[];
    h3Count: number;
    imageCount: number;
    imagesWithoutAlt: number;
    internalLinks: number;
    externalLinks: number;
    wordCount: number;
    hasSchemaMarkup: boolean;
    schemaTypes: string[];
    hasSitemap: boolean;
    sitemapUrl: string;
    robotsMeta: string;
    isIndexable: boolean;
  };
  social: {
    hasOpenGraph: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    hasTwitterCard: boolean;
    twitterCard: string;
  };
  technical: {
    isHttps: boolean;
    hasViewportMeta: boolean;
    hasCanonical: boolean;
    responseTimeMs: number;
    technologies: string[];
    hasGoogleAnalytics: boolean;
    hasGTM: boolean;
    gtmId: string;
  };
  content: {
    headings: { level: string; text: string }[];
    mainKeywords: string[];
    hasContactInfo: boolean;
    hasPricingPage: boolean;
    hasBlogSection: boolean;
    ctaTexts: string[];
  };
}

export type LlmQueryCategory = "direct" | "category" | "competitor";

export type LlmSentiment = "positive" | "neutral" | "negative" | "not_mentioned";

export interface LlmVisibilityQueryResult {
  brandName: string;
  brandUrl: string;
  llmProvider: "openai" | "anthropic" | "gemini";
  llmModel: string;
  queryText: string;
  queryCategory: LlmQueryCategory;
  brandMentioned: boolean;
  mentionPosition: number | null;
  sentiment: LlmSentiment;
  exactQuote: string | null;
  competitorsMentioned: string[];
  fullResponse: string;
  visibilityScore: number;
  queriedAt: string;
}

export interface BrandAuditScores {
  seoScore: number;
  technicalScore: number;
  contentScore: number;
  llmVisibilityScore: number;
  overallHealthScore: number;
}

export interface BrandAuditReport {
  brandName: string;
  brandUrl: string;
  isSampleData: boolean;
  generatedAt: string;
  websiteAudit: WebsiteAuditResult | null;
  scores: BrandAuditScores;
  llmResults: LlmVisibilityQueryResult[];
  competitorsFound: string[];
  recommendations: string[];
}
