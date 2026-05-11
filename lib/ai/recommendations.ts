import type { Pattern, SentimentResult } from "./types";
import { DEMO_PATTERNS } from "@/lib/demo-data";

/** Minimal slice for pattern detection (per model or aggregated run). */
export interface PatternSlice {
  visibility: boolean;
  sentiment: SentimentResult;
  position: number;
  positionsByBrand?: Record<string, number>;
}

export const PATTERNS = {
  NEGATIVE_SENTIMENT: "negative_sentiment",
  MISSING_FEATURE: "missing_feature",
  COMPETITOR_DOMINANCE: "competitor_dominance",
  LOW_VISIBILITY: "low_visibility",
  CITATION_GAP: "citation_gap",
  TRUST_DEFICIT: "trust_deficit",
  RANKING_LOW: "ranking_low",
  KEYWORD_ASSOCIATION: "keyword_association",
} as const;

const SEVERITY_SCORE: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function extractNegativeKeywords(results: PatternSlice[]): string[] {
  const words = new Set<string>();
  for (const r of results) {
    for (const k of r.sentiment.negativeSignals ?? []) words.add(k);
    for (const k of r.sentiment.keywords ?? []) {
      if (r.sentiment.score < 50) words.add(k);
    }
  }
  return Array.from(words).slice(0, 8);
}

export function detectPatterns(analysisResults: PatternSlice[]): Pattern[] {
  const patterns: Pattern[] = [];

  const avgSentiment = average(analysisResults.map((r) => r.sentiment.score));
  if (avgSentiment < 45) {
    patterns.push({
      type: PATTERNS.NEGATIVE_SENTIMENT,
      severity: avgSentiment < 30 ? "critical" : "high",
      evidence: extractNegativeKeywords(analysisResults),
      recommendations: [
        "Create pricing comparison pages highlighting value",
        "Add ROI calculator to your website",
        "Improve onboarding documentation",
        "Publish customer success case studies",
      ],
    });
  }

  const visibilityRate =
    analysisResults.filter((r) => r.visibility).length / Math.max(analysisResults.length, 1);
  if (visibilityRate < 0.4) {
    patterns.push({
      type: PATTERNS.LOW_VISIBILITY,
      severity: "high",
      evidence: [`Brand mentioned in only ${Math.round(visibilityRate * 100)}% of relevant prompts`],
      recommendations: [
        "Write GEO-optimized articles targeting your category keywords",
        "Build topical authority with in-depth guides",
        "Increase PR and brand mention campaigns",
        "Add structured FAQ schema to key pages",
        "Create comparison pages vs top competitors",
      ],
    });
  }

  const firstCounts: Record<string, number> = {};
  for (const r of analysisResults) {
    for (const [name, pos] of Object.entries(r.positionsByBrand ?? {})) {
      if (pos === 1) firstCounts[name] = (firstCounts[name] ?? 0) + 1;
    }
  }
  const ranked = Object.entries(firstCounts).sort((a, b) => b[1] - a[1]);
  const [leader, wins = 0] = ranked[0] ?? [];

  if (leader && analysisResults.length > 0 && wins >= analysisResults.length * 0.65) {
    patterns.push({
      type: PATTERNS.COMPETITOR_DOMINANCE,
      severity: "medium",
      evidence: [`${leader} is listed first in ${Math.round((wins / analysisResults.length) * 100)}% of model responses`],
      recommendations: [
        `Publish comparison pages vs ${leader}`,
        "Add migration guides and proof points",
        "Capture mid-funnel queries with deeper templates",
      ],
    });
  }

  return patterns;
}

export interface RecommendationItem {
  action: string;
  pattern: string;
  priority: Pattern["severity"];
  expectedImpact: string;
}

function estimateImpact(patternType: string): string {
  if (patternType === PATTERNS.NEGATIVE_SENTIMENT) return "+12 Sentiment";
  if (patternType === PATTERNS.LOW_VISIBILITY) return "+10 Visibility";
  if (patternType === PATTERNS.COMPETITOR_DOMINANCE) return "+8 Position";
  return "+5 Score";
}

export function generateRecommendations(patterns: Pattern[]): RecommendationItem[] {
  return patterns
    .sort((a, b) => (SEVERITY_SCORE[b.severity] ?? 0) - (SEVERITY_SCORE[a.severity] ?? 0))
    .flatMap((pattern) =>
      pattern.recommendations.map((rec) => ({
        action: rec,
        pattern: pattern.type,
        priority: pattern.severity,
        expectedImpact: estimateImpact(pattern.type),
      })),
    );
}

export function demoPatternsFromSeed(): Pattern[] {
  return DEMO_PATTERNS.map((p) => ({
    type: p.type,
    severity: p.severity,
    evidence: [p.evidence],
    recommendations: p.recommendations,
  }));
}
