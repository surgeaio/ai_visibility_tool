export type AIModelKey = "openai" | "anthropic";
export type ProviderName = "openai" | "anthropic" | "gemini" | "perplexity";

export interface Citation {
  url: string;
  domain: string;
  title?: string;
  snippet?: string;
  position: number;
}

export interface AIExecuteOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  systemPrompt?: string;
  requestId: string;
}

export interface AIResponse {
  provider: ProviderName;
  model: string;
  rawResponse: string;
  citations: Citation[];
  tokensUsed: { input: number; output: number };
  cost: number;
  latency: number;
  timestamp: Date;
  requestId: string;
}

export interface OrchestratorResult {
  requestId: string;
  prompt: string;
  responses: AIResponse[];
  failures: Array<{ provider: ProviderName; error: string }>;
  totalCost: number;
  totalLatency: number;
}

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
