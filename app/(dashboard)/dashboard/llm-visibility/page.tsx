"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [focusPromptId, setFocusPromptId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LlmVisibilityDashboardResponse>(EMPTY_DASHBOARD);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchGenerationRef = useRef(0);

  const fetchAllData = useCallback(async () => {
    if (!selectedBrandId) {
      setData(EMPTY_DASHBOARD);
      setLoading(false);
      return;
    }

    const generation = ++fetchGenerationRef.current;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const params = new URLSearchParams({
        brandId: selectedBrandId,
        range: dateRange,
      });
      if (selectedBrandIds.length) {
        params.set("brandIds", selectedBrandIds.join(","));
      }
      if (selectedModels.length) {
        params.set("models", selectedModels.join(","));
      }
      if (selectedPrompts.length) {
        params.set("promptIds", selectedPrompts.join(","));
      }
      if (focusPromptId) {
        params.set("focusPromptId", focusPromptId);
      }

      const res = await fetch(`/api/llm-visibility?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const json = (await res.json()) as LlmVisibilityDashboardResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load LLM visibility");
      }

      if (generation !== fetchGenerationRef.current) return;

      console.log("[LLM Visibility] Data received:", {
        empty: json.empty,
        chartPoints: json.chartData?.length ?? 0,
        byDate: json.byDate?.length ?? 0,
      });
      setData(json);
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      console.error("Failed to fetch LLM visibility data:", err);
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out after 15 seconds. Try again or run prompts first."
          : err instanceof Error
            ? err.message
            : "Failed to load data";
      setError(message);
      setData(EMPTY_DASHBOARD);
    } finally {
      clearTimeout(timeoutId);
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [
    selectedBrandId,
    dateRange,
    selectedBrandIds,
    selectedModels,
    selectedPrompts,
    focusPromptId,
  ]);

  useEffect(() => {
    if (!selectedBrandId) return;
    setSelectedBrandIds([selectedBrandId]);
    setSelectedModels([]);
    setSelectedPrompts([]);
    setFocusPromptId(null);
  }, [selectedBrandId]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData, refreshKey]);

  useEffect(() => {
    if (!loading) return;
    const forceStop = setTimeout(() => {
      console.warn("[LLM Visibility] Force stopping loading after 20s");
      setLoading(false);
    }, 20000);
    return () => clearTimeout(forceStop);
  }, [loading]);

  function scheduleDataRefresh() {
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshKey((k) => k + 1), 3000);
    setTimeout(() => setRefreshKey((k) => k + 1), 6000);
  }

  async function handleRunPromptsNow() {
    if (!selectedBrandId || runningAll) return;
    setRunningAll(true);
    try {
      const res = await fetch("/api/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        queued?: boolean;
        completed?: number;
        failed?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? json.message ?? "Run failed");
      }
      if (json.queued) {
        toast.success(json.message ?? "Prompts queued. Results in 2–3 minutes.");
      } else {
        toast.success(`Completed ${json.completed ?? 0} prompts (${json.failed ?? 0} failed).`);
        scheduleDataRefresh();
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
            availableModels={data.availableModels}
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
            <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-12 text-center">
              <p className="font-medium text-white">No LLM visibility data yet</p>
              <p className="mt-2 text-sm text-neutral-500">
                Run prompts for this client to populate charts and tables.
              </p>
              <Button className="mt-4" size="sm" onClick={() => setRunModalOpen(true)}>
                Run prompts now
              </Button>
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
        onSuccess={scheduleDataRefresh}
      />
    </div>
  );
}
