/** Matches `GET /api/llm-visibility` JSON `data` field. */
export type LlmVisibilityTrendPoint = {
  day: string;
  chatgpt: number;
  claude: number;
  gemini: number;
};

export type LlmVisibilityPayload = {
  empty: boolean;
  overall: number | null;
  platformScores: Array<{
    platform: string;
    score: number;
    sentiment: "positive" | "neutral" | "negative";
  }>;
  trend: LlmVisibilityTrendPoint[];
  topPrompts: Array<{ id: string; text: string; avgScore: number | null }>;
  needsAttention: Array<{ id: string; text: string; issue: string }>;
};
