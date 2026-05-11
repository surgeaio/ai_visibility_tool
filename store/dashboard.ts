import { create } from "zustand";
import {
  DEMO_BRAND,
  DEMO_COMPETITORS,
  DEMO_PROMPTS,
  DEMO_RECOMMENDATIONS,
} from "@/lib/demo-data";

export type DateRange = "7d" | "30d" | "90d";
export type ModelFilter = "all" | "chatgpt" | "gemini" | "claude" | "perplexity";

interface DashboardState {
  brandName: string;
  dateRange: DateRange;
  modelFilter: ModelFilter;
  recommendationCompleted: Record<string, boolean>;
  setBrandName: (name: string) => void;
  setDateRange: (r: DateRange) => void;
  setModelFilter: (m: ModelFilter) => void;
  toggleRecommendationDone: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  brandName: DEMO_BRAND.name,
  dateRange: "30d",
  modelFilter: "all",
  recommendationCompleted: Object.fromEntries(
    DEMO_RECOMMENDATIONS.filter((r) => r.status === "done").map((r) => [r.id, true]),
  ),
  setBrandName: (name) => set({ brandName: name }),
  setDateRange: (dateRange) => set({ dateRange }),
  setModelFilter: (modelFilter) => set({ modelFilter }),
  toggleRecommendationDone: (id) =>
    set({
      recommendationCompleted: {
        ...get().recommendationCompleted,
        [id]: !get().recommendationCompleted[id],
      },
    }),
}));

export function useBrandMetrics() {
  const brandName = useDashboardStore((s) => s.brandName);
  const base =
    brandName === DEMO_BRAND.name
      ? DEMO_BRAND.metrics
      : { visibility: 58, sentiment: 76, position: 3.1, promptsTracked: 98 };
  return { brandName, ...base, competitors: DEMO_COMPETITORS, prompts: DEMO_PROMPTS };
}
