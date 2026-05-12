import { create } from "zustand";
import {
  DEMO_BRAND,
  DEMO_COMPETITORS,
  DEMO_PROMPTS,
  DEMO_RECOMMENDATIONS,
} from "@/lib/demo/seed-data";

export type DateRange = "7d" | "30d" | "90d";
export type ModelFilter = "all" | "chatgpt" | "gemini" | "claude" | "perplexity";

export type DashboardPromptRow = {
  id: string;
  text: string;
  category: string;
  visibility: boolean;
  sentiment: number | null;
  lastRun: string;
};

function mapSeedPrompts(): DashboardPromptRow[] {
  return DEMO_PROMPTS.map((p) => ({
    id: p.id,
    text: p.text,
    category: p.category,
    visibility: p.visibility,
    sentiment: p.sentiment,
    lastRun: p.lastRun,
  }));
}

interface DashboardState {
  brandName: string;
  dateRange: DateRange;
  modelFilter: ModelFilter;
  recommendationCompleted: Record<string, boolean>;
  apiPrompts: DashboardPromptRow[];
  apiPromptsStatus: "idle" | "loading" | "ready" | "error";
  apiPromptsError: string | null;
  setBrandName: (name: string) => void;
  setDateRange: (r: DateRange) => void;
  setModelFilter: (m: ModelFilter) => void;
  toggleRecommendationDone: (id: string) => void;
  fetchApiPrompts: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  brandName: DEMO_BRAND.name,
  dateRange: "30d",
  modelFilter: "all",
  recommendationCompleted: Object.fromEntries(
    DEMO_RECOMMENDATIONS.filter((r) => r.status === "done").map((r) => [r.id, true]),
  ),
  apiPrompts: mapSeedPrompts(),
  apiPromptsStatus: "idle",
  apiPromptsError: null,
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
  fetchApiPrompts: async () => {
    set({ apiPromptsStatus: "loading", apiPromptsError: null });
    try {
      const res = await fetch(
        "/api/prompts?limit=100&offset=0&sortBy=last_run&sortOrder=desc",
        { cache: "no-store" },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { prompts: DashboardPromptRow[] };
      set({
        apiPrompts: json.prompts,
        apiPromptsStatus: "ready",
        apiPromptsError: null,
      });
    } catch (error) {
      set({
        apiPromptsStatus: "error",
        apiPromptsError: error instanceof Error ? error.message : "Failed to load prompts",
        apiPrompts: mapSeedPrompts(),
      });
    }
  },
}));

export function useBrandMetrics() {
  const brandName = useDashboardStore((s) => s.brandName);
  const prompts = useDashboardStore((s) => s.apiPrompts);
  const base =
    brandName === DEMO_BRAND.name
      ? DEMO_BRAND.metrics
      : { visibility: 58, sentiment: 76, position: 3.1, promptsTracked: 98 };
  return { brandName, ...base, competitors: DEMO_COMPETITORS, prompts };
}
