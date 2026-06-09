export type AIModel = "chatgpt" | "claude" | "gemini";

export type DailyMetric = {
  brand_id: string;
  ai_model: AIModel | "all";
  metric_date: string;
  visibility_pct: number;
  avg_position: number | null;
  avg_sentiment: number | null;
  total_chats: number;
  brand_mentions: number;
};

export type VisibilityRecommendation = {
  id: string;
  recommendation_type:
    | "source_opportunity"
    | "content_gap"
    | "sentiment_improvement"
    | "competitor_outrank"
    | "prompt_suggestion";
  title: string;
  description: string;
  action_items: string[];
  priority: "high" | "medium" | "low";
  impact_score: number;
  status: "open" | "in_progress" | "completed" | "dismissed";
};
