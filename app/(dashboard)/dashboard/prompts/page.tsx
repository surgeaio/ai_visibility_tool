"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, MoreHorizontal, Plus, Play, RefreshCw } from "lucide-react";
import { PromptDetailSheet } from "@/components/dashboard/PromptDetailSheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DEMO_BRAND } from "@/lib/demo/seed-data";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";

export default function PromptsPage() {
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);
  const prompts = useDashboardStore((s) => s.apiPrompts);
  const promptsStatus = useDashboardStore((s) => s.apiPromptsStatus);
  const promptsError = useDashboardStore((s) => s.apiPromptsError);
  const fetchApiPrompts = useDashboardStore((s) => s.fetchApiPrompts);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [category, setCategory] = useState("CRM");
  const [runNow, setRunNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [llmResults, setLlmResults] = useState<
    Array<{
      platform: string;
      rawResponse: string;
      visibilityScore: number | null;
      sentimentScore: number | null;
    }>
  >([]);
  const [llmResultsLoading, setLlmResultsLoading] = useState(false);
  const [visibilityByPrompt, setVisibilityByPrompt] = useState<
    Record<string, { visibility_pct: number | null; avg_sentiment: number | null; last_run: string | null }>
  >({});
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    setSelected({});
    void fetchApiPrompts(selectedBrandId || undefined);
    if (!selectedBrandId) {
      setVisibilityByPrompt({});
      return;
    }
    void fetch(`/api/visibility/prompt-results?brandId=${selectedBrandId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json: { prompts?: Array<{ id: string; visibility_pct: number | null; avg_sentiment: number | null; last_run: string | null }> }) => {
        const map: typeof visibilityByPrompt = {};
        for (const row of json.prompts ?? []) {
          map[row.id] = {
            visibility_pct: row.visibility_pct,
            avg_sentiment: row.avg_sentiment,
            last_run: row.last_run,
          };
        }
        setVisibilityByPrompt(map);
      })
      .catch(() => setVisibilityByPrompt({}));
  }, [selectedBrandId, fetchApiPrompts]);

  const detail = useMemo(() => prompts.find((p) => p.id === detailId), [prompts, detailId]);

  useEffect(() => {
    if (!detailId) {
      setLlmResults([]);
      return;
    }
    setLlmResultsLoading(true);
    void fetch(`/api/prompts/${encodeURIComponent(detailId)}/llm-results`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { results?: typeof llmResults }) => {
        setLlmResults(json.results ?? []);
      })
      .catch(() => setLlmResults([]))
      .finally(() => setLlmResultsLoading(false));
  }, [detailId]);

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  async function addPrompt() {
    if (!newPrompt.trim() || saving || !selectedBrandId) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newPrompt.trim(),
          category,
          brandId: selectedBrandId,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()) || res.statusText);
      }
      const created = (await res.json()) as {
        id: string;
        text: string;
        category: string;
        visibility: boolean;
        sentiment: number | null;
        lastRun: string;
      };
      if (runNow) {
        await fetch(`/api/prompts/${encodeURIComponent(created.id)}/run`, { method: "POST" });
      }
      setNewPrompt("");
      setModalOpen(false);
      await fetchApiPrompts(selectedBrandId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to save prompt");
    } finally {
      setSaving(false);
    }
  }

  async function removePrompt(id: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/prompts/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error((await res.text()) || res.statusText);
      }
      setSelected((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      await fetchApiPrompts(selectedBrandId || undefined);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function runPrompt(id: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/prompts/${encodeURIComponent(id)}/run`, { method: "POST" });
      if (!res.ok) {
        throw new Error((await res.text()) || res.statusText);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to enqueue run");
    }
  }

  async function handleRunAllPrompts() {
    if (!selectedBrandId || runningAll) return;
    setRunningAll(true);
    setActionError(null);
    try {
      const res = await fetch("/api/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; completed?: number; failed?: number };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Run failed");
      await fetchApiPrompts(selectedBrandId);
      const metricsRes = await fetch(`/api/visibility/prompt-results?brandId=${selectedBrandId}`, {
        cache: "no-store",
      });
      const metricsJson = (await metricsRes.json()) as {
        prompts?: Array<{ id: string; visibility_pct: number | null; avg_sentiment: number | null; last_run: string | null }>;
      };
      const map: typeof visibilityByPrompt = {};
      for (const row of metricsJson.prompts ?? []) {
        map[row.id] = {
          visibility_pct: row.visibility_pct,
          avg_sentiment: row.avg_sentiment,
          last_run: row.last_run,
        };
      }
      setVisibilityByPrompt(map);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to run prompts");
    } finally {
      setRunningAll(false);
    }
  }

  async function runSelected() {
    setActionError(null);
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/prompts/${encodeURIComponent(id)}/run`, { method: "POST" });
        if (!res.ok) {
          throw new Error((await res.text()) || res.statusText);
        }
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to enqueue runs");
    }
  }

  function exportCsv() {
    const rows = prompts.map((p) =>
      [p.text, p.category, p.lastRun, p.visibility, p.sentiment ?? ""].join(","),
    );
    const blob = new Blob([["Prompt,Category,Last Run,Visibility,Sentiment\n", ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Prompts</h2>
          <p className="text-sm text-neutral-500">Manage tracked prompts and review multi-model responses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!selectedBrandId || runningAll}
            onClick={() => void handleRunAllPrompts()}
          >
            {runningAll ? "Running…" : "Run all prompts"}
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => void runSelected()}>
              <Play className="mr-2 h-4 w-4" />
              Run selected ({selectedIds.length})
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchApiPrompts(selectedBrandId || undefined)}
            disabled={promptsStatus === "loading"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${promptsStatus === "loading" ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Prompt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add prompt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="pt">Prompt text</Label>
                  <Input
                    id="pt"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="e.g. Best CRM for startups"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["CRM", "AI Tools", "Marketing", "SEO", "Sales"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="run" checked={runNow} onCheckedChange={(v) => setRunNow(Boolean(v))} />
                  <Label htmlFor="run">Run immediately</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void addPrompt()} disabled={saving || !selectedBrandId}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedBrandId ? (
        <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-white">Select a client</h3>
          <p className="mt-2 text-sm text-neutral-400">Choose a client from the sidebar to manage their prompts.</p>
        </div>
      ) : null}

      {promptsError ? (
        <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          <span className="font-medium">Could not load prompts.</span>{" "}
          <span className="text-amber-200/80">{promptsError}</span>
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#111]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
            <tr>
              <th className="w-10 p-4">
                <Checkbox
                  checked={selectedIds.length === prompts.length && prompts.length > 0}
                  onCheckedChange={(v) => {
                    const next = Boolean(v);
                    const map: Record<string, boolean> = {};
                    prompts.forEach((p) => {
                      map[p.id] = next;
                    });
                    setSelected(map);
                  }}
                />
              </th>
              <th className="p-4 font-medium">Prompt</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Last run</th>
              <th className="p-4 font-medium">Visibility</th>
              <th className="p-4 font-medium">Sentiment</th>
              <th className="w-12 p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {promptsStatus === "loading" && prompts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-neutral-500">
                  Loading prompts…
                </td>
              </tr>
            ) : null}
            {selectedBrandId &&
            promptsStatus !== "loading" &&
            prompts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center">
                  <p className="font-medium text-white">No prompts yet</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Add your first prompt for {brandName || "this client"}.
                  </p>
                </td>
              </tr>
            ) : null}
            {prompts.map((p) => (
              <tr key={p.id} className="hover:bg-[#1a1a1a]/50">
                <td className="p-4">
                  <Checkbox
                    checked={!!selected[p.id]}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: Boolean(v) }))}
                  />
                </td>
                <td className="max-w-xs truncate p-4 text-neutral-200">{p.text}</td>
                <td className="p-4 text-neutral-400">{p.category}</td>
                <td className="p-4 font-mono text-xs text-neutral-500">
                  {visibilityByPrompt[p.id]?.last_run
                    ? new Date(visibilityByPrompt[p.id].last_run!).toLocaleDateString()
                    : new Date(p.lastRun).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {visibilityByPrompt[p.id]?.visibility_pct == null ? (
                    <span className="text-sm text-neutral-500">Not run yet</span>
                  ) : (
                    <span
                      className={
                        visibilityByPrompt[p.id]!.visibility_pct! >= 50
                          ? "text-emerald-400"
                          : "text-neutral-200"
                      }
                    >
                      {visibilityByPrompt[p.id]!.visibility_pct}%
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {visibilityByPrompt[p.id]?.avg_sentiment == null ? (
                    <span className="text-neutral-500">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-10 overflow-hidden rounded bg-[#262626]">
                        <div
                          className={`h-2 rounded ${
                            visibilityByPrompt[p.id]!.avg_sentiment! >= 70
                              ? "bg-emerald-500"
                              : visibilityByPrompt[p.id]!.avg_sentiment! >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${visibilityByPrompt[p.id]!.avg_sentiment}%` }}
                        />
                      </div>
                      <span className="text-sm text-neutral-300">
                        {visibilityByPrompt[p.id]!.avg_sentiment}
                      </span>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailId(p.id)}>View results</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void runPrompt(p.id)}>Run now</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={() => void removePrompt(p.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Prompt detail</SheetTitle>
            <SheetDescription className="text-left">{detail?.text}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <PromptDetailSheet
              brandName={brandName || DEMO_BRAND.name}
              loading={llmResultsLoading}
              results={llmResults}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
