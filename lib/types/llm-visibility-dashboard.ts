export type LlmVisibilityBrand = {
  id: string;
  name: string;
};

export type LlmVisibilityPromptOption = {
  id: string;
  prompt: string;
};

export type LlmVisibilityChartRow = Record<string, string | number | null>;

export type LlmVisibilityByDateRow = {
  date: string;
} & Record<string, string | number | null>;

export type LlmVisibilityByModelData = Record<string, Record<string, string | number | null>>;

export type LlmVisibilityPromptPerformance = {
  promptId: string;
  prompt: string;
  dates: Array<Record<string, string | number | null>>;
};

export type LlmVisibilityModelError = {
  model: string;
  error: string;
};

export type LlmVisibilityDashboardResponse = {
  empty: boolean;
  /** When empty=true, explains why (e.g. recent runs failed). */
  emptyReason?: "no_data" | "runs_failed";
  recentModelErrors?: LlmVisibilityModelError[];
  responsesInRange?: number;
  chartData: LlmVisibilityChartRow[];
  brands: LlmVisibilityBrand[];
  availableBrands: LlmVisibilityBrand[];
  availableModels: Array<{ slug: string; label: string }>;
  byDate: LlmVisibilityByDateRow[];
  byModel: LlmVisibilityByModelData;
  prompts: LlmVisibilityPromptOption[];
  promptPerformance: LlmVisibilityPromptPerformance | null;
};
