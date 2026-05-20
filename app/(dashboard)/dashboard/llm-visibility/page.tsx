"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Zap } from "lucide-react";
import { toast } from "sonner";
import { RunPromptsModal } from "./_components/RunPromptsModal";
import { LLMVisibilityFilters } from "@/components/llm-visibility/LLMVisibilityFilters";
import { VisibilityCharts } from "@/components/llm-visibility/VisibilityCharts";
import { BrandPerformanceByDate } from "@/components/llm-visibility/BrandPerformanceTable";
import { BrandPerformanceByModel } from "@/components/llm-visibility/BrandByModelTable";
import { PromptPerformanceTable } from "@/components/llm-visibility/PromptPerformanceTable";
import { Button } from "@/components/ui/button";
import type { LlmVisibilityDashboardResponse } from "@/lib/types/llm-visibility-dashboard";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { ALL_AVAILABLE_MODELS } from "@/lib/ai/models";

const EMPTY_DASHBOARD: LlmVisibilityDashboardResponse = {
  empty: true,
  chartData: [],
  brands: [],
  availableBrands: [],
  availableModels: [],
  byDate: [],
  byModel: {},
  prompts: [],
  promptPerformance: null,
};

export default function LLMVisibilityPage() {
  const { selectedBrandId } = useSelectedBrand();

  const [dateRange, setDateRange] = useState("7d");
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(["chatgpt", "claude", "gemini", "perplexity"]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [focusPromptId, setFocusPromptId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LlmVisibilityDashboardResponse>(EMPTY_DASHBOARD);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterVersion, setFilterVersion] = useState(0);

  const filterRef = useRef({
    selectedBrandIds: [] as string[],
    selectedModels: ["chatgpt", "claude", "gemini", "perplexity"] as string[],
    selectedPrompts: [] as string[],
    focusPromptId: null as string | null,
  });

  filterRef.current = {
    selectedBrandIds,
    selectedModels,
    selectedPrompts,
    focusPromptId,
  };

  useEffect(() => {
    if (!selectedBrandId) return;
    setSelectedBrandIds([selectedBrandId]);
    setSelectedModels(["chatgpt", "claude", "gemini", "perplexity"]);
    setSelectedPrompts([]);
    setFocusPromptId(null);
  }, [selectedBrandId]);

  useEffect(() => {
    if (!selectedBrandId) {
      setData(EMPTY_DASHBOARD);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const f = filterRef.current;
        const params = new URLSearchParams({
          brandId: selectedBrandId,
          range: dateRange,
        });
        if (f.selectedBrandIds.length) params.set("brandIds", f.selectedBrandIds.join(","));
        if (f.selectedModels.length) params.set("models", f.selectedModels.join(","));
        if (f.selectedPrompts.length) params.set("promptIds", f.selectedPrompts.join(","));
        if (f.focusPromptId) params.set("focusPromptId", f.focusPromptId);

        const res = await fetch(`/api/llm-visibility?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await res.json()) as LlmVisibilityDashboardResponse & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed to load LLM visibility");
        if (cancelled) return;

        console.log("[LLM Visibility] Data received:", {
          empty: json.empty,
          chartPoints: json.chartData?.length ?? 0,
          byDate: json.byDate?.length ?? 0,
        });
        setData(json);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error && err.name === "AbortError"
              ? "Request timed out after 15 seconds. Try again or run prompts first."
              : err instanceof Error
                ? err.message
                : "Failed to load data";
          setError(message);
          setData(EMPTY_DASHBOARD);
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [selectedBrandId, dateRange, refreshKey, filterVersion]);

  useEffect(() => {
    const t = setTimeout(() => setFilterVersion((v) => v + 1), 400);
    return () => clearTimeout(t);
  }, [selectedBrandIds, selectedModels, selectedPrompts, focusPromptId]);

  async function handleRunPromptsNow() {
    if (!selectedBrandId || runningAll) return;
    setRunningAll(true);
    try {
      const res = await fetch("/api/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: selectedBrandId,
          models: selectedModels.length > 0 ? selectedModels : ["chatgpt", "claude", "gemini", "perplexity"],
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        queued?: boolean;
        completed?: number;
        failed?: number;
        error?: string;
        message?: string;
        warning?: string;
        saveStats?: {
          analysesSaved?: number;
          responsesSaved?: number;
          llmFailed?: number;
          analysisFailed?: number;
        };
        modelErrors?: Array<{ model: string; error: string }>;
      };
      if (!res.ok) {
        throw new Error(json.error ?? json.message ?? "Run failed");
      }
      if (json.warning) {
        toast.warning(json.warning, { duration: 8000 });
      }
      if (json.modelErrors?.length) {
        const preview = json.modelErrors
          .slice(0, 2)
          .map((e) => `${e.model}: ${e.error.slice(0, 80)}`)
          .join(" · ");
        toast.error(`Model errors — ${preview}`, { duration: 10000 });
      }
      if (json.queued) {
        toast.success(json.message ?? "Prompts queued. Results in 2–3 minutes.");
      } else {
        const saved = json.saveStats?.analysesSaved ?? 0;
        const llmFailed = json.saveStats?.llmFailed ?? 0;
        if (saved > 0) {
          toast.success(
            `Completed ${json.completed ?? 0} prompts. ${saved} analyses saved.`,
          );
        } else if (llmFailed > 0 || json.modelErrors?.length) {
          // Warning/error toasts already shown above
        } else if (!json.warning) {
          toast.success(`Completed ${json.completed ?? 0} prompts.`);
        }
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run prompts");
    } finally {
      setRunningAll(false);
    }
  }

  async function handleReanalyze() {
    if (!selectedBrandId || reanalyzing) return;
    setReanalyzing(true);
    try {
      const res = await fetch("/api/visibility/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      const json = (await res.json()) as { updated?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Re-analyze failed");
      toast.success(`Re-analyzed ${json.updated ?? 0} saved responses`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-analyze failed");
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleDownloadReport() {
    if (!selectedBrandId) return;
    const params = new URLSearchParams({
      brandId: selectedBrandId,
      range: dateRange,
    });
    if (selectedBrandIds.length) params.set("brandIds", selectedBrandIds.join(","));
    if (selectedModels.length) params.set("models", selectedModels.join(","));
    if (selectedPrompts.length) params.set("promptIds", selectedPrompts.join(","));
    if (focusPromptId) params.set("focusPromptId", focusPromptId);

    const res = await fetch(`/api/llm-visibility/export?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llm-visibility-${selectedBrandId}-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const promptLabel =
    data.promptPerformance?.prompt ??
    data.prompts.find((p) => p.id === focusPromptId)?.prompt?.slice(0, 80) ??
    "";

  return (
    <div className="space-y-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">LLM Visibility</h2>
          <p className="mt-1 text-sm text-neutral-500">Where AI assistants mention your brand</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={runningAll || !selectedBrandId}
            onClick={() => void handleRunPromptsNow()}
          >
            <Zap className="mr-2 h-4 w-4" />
            {runningAll ? "Running prompts…" : "Run Prompts Now"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRunModalOpen(true)}>
            Quick run
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={reanalyzing || !selectedBrandId}
            onClick={() => void handleReanalyze()}
          >
            {reanalyzing ? "Re-analyzing…" : "Re-analyze saved"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => void handleDownloadReport()}
            disabled={!selectedBrandId || loading}
          >
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {!selectedBrandId ? (
        <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-12 text-center">
          <p className="text-neutral-400">Select a client from the sidebar to view LLM visibility.</p>
        </div>
      ) : (
        <>
          <LLMVisibilityFilters
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedBrandIds={selectedBrandIds}
            setSelectedBrandIds={setSelectedBrandIds}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            selectedPrompts={selectedPrompts}
            setSelectedPrompts={setSelectedPrompts}
            availableBrands={data.availableBrands}
            availableModels={
              data.availableModels.length > 0 ? data.availableModels : ALL_AVAILABLE_MODELS
            }
            prompts={data.prompts}
          />

          {error ? (
            <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-100">
              <p className="font-medium">Failed to load data</p>
              <p className="mt-1 text-xs text-red-200/80">{error}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="secondary"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-neutral-500">Loading visibility data…</p>
            </div>
          ) : data.empty ? (
            <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-12">
              {data.emptyReason === "runs_failed" && (data.recentModelErrors?.length ?? 0) > 0 ? (
                <>
                  <p className="text-center font-medium text-white">
                    Prompts ran but no visibility scores were saved
                  </p>
                  <p className="mt-2 text-center text-sm text-neutral-500">
                    {data.responsesInRange ?? 0} model call(s) in the last {dateRange} — all failed or
                    produced no analysis. Fix the errors below, then run again.
                  </p>
                  <ul className="mx-auto mt-4 max-w-2xl space-y-2 text-left text-xs text-red-200/90">
                    {data.recentModelErrors?.map((e) => (
                      <li
                        key={e.model}
                        className="rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2"
                      >
                        <span className="font-medium text-red-100">{e.model}</span>
                        <span className="mt-1 block text-red-200/80">{e.error}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex justify-center gap-2">
                    <Button size="sm" onClick={() => void handleRunPromptsNow()} disabled={runningAll}>
                      Retry run
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleReanalyze()}>
                      Re-analyze saved
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center font-medium text-white">No LLM visibility data yet</p>
                  <p className="mt-2 text-center text-sm text-neutral-500">
                    Run prompts for this client to populate charts and tables.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button size="sm" onClick={() => void handleRunPromptsNow()} disabled={runningAll}>
                      Run prompts now
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <VisibilityCharts data={data.chartData} brands={data.brands} />
              <BrandPerformanceByDate data={data.byDate} brands={data.brands} />
              <BrandPerformanceByModel data={data.byModel} brands={data.brands} />
              {(data.promptPerformance || data.prompts.length > 0) && (
                <PromptPerformanceTable
                  promptData={data.promptPerformance}
                  selectedPrompt={promptLabel}
                  prompts={data.prompts}
                  onSelectPrompt={(id) => {
                    setFocusPromptId(id);
                    setFilterVersion((v) => v + 1);
                  }}
                />
              )}
            </>
          )}
        </>
      )}

      <RunPromptsModal
        open={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
