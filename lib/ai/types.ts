export type AIModelKey = "openai" | "anthropic";

export interface SentimentResult {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  confidence: number;
  positiveSignals: string[];
  negativeSignals: string[];
  keywords: string[];
  pattern: string | null;
}

export interface MentionSlice {
  brand: string;
  index: number;
  context: string;
}

export interface Pattern {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
  recommendations: string[];
}

export interface AnalysisResult {
  responses: string[];
  visibilityPct: number;
  sentiment: SentimentResult;
  position: number;
  patterns: Pattern[];
  perModel: {
    model: AIModelKey;
    response: string;
    visibility: boolean;
    sentiment: SentimentResult;
    position: number;
    positionsByBrand: Record<string, number>;
  }[];
  rawData: {
    responses: string[];
    mentions: MentionSlice[];
    sentiments: SentimentResult[];
  };
}
