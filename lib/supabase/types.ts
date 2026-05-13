/** Align with Supabase schema / SQL in repo */
export type BrandRow = {
  id: string;
  user_id: string | null;
  name: string;
  website: string | null;
  category: string | null;
  created_at: string;
};

export type PromptRow = {
  id: string;
  brand_id: string;
  text: string;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
};

export type AnalysisResultRow = {
  id: string;
  prompt_id: string;
  brand_id: string;
  model: string;
  response_text: string | null;
  visibility: boolean | null;
  position: number | null;
  sentiment: string | null;
  sentiment_score: number | null;
  confidence: number | null;
  positive_signals: string[] | null;
  negative_signals: string[] | null;
  keywords: string[] | null;
  analyzed_at: string;
};

export type CompetitorRow = {
  id: string;
  brand_id: string;
  competitor_name: string;
  created_at: string;
};

export type RecommendationRow = {
  id: string;
  brand_id: string | null;
  pattern_id: string | null;
  pattern_type: string | null;
  action: string | null;
  description: string | null;
  priority: string | null;
  category: string | null;
  expected_geo_gain: number | null;
  status: string | null;
  created_at: string;
  difficulty?: string | null;
  estimated_time?: string | null;
  implementation_steps?: unknown;
  success_metrics?: unknown;
  evidence?: unknown;
  impact_score?: number | null;
};

export type CitationRow = {
  id: string;
  brand_id: string;
  url: string;
  domain: string;
  provider: string | null;
  created_at: string;
};
