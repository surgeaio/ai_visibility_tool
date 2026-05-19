"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RecommendationEntity } from "@/lib/repositories/recommendations.repo";
import { useDashboardStore } from "@/store/dashboard";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSelectedBrand } from "@/lib/context/brand-context";

type TabKey = "all" | "llm" | "google" | "website" | "competitor";

function tabMatch(tab: TabKey, r: RecommendationEntity): boolean {
  if (tab === "all") return true;
  const p = r.pattern.toLowerCase();
  const c = r.category;
  if (tab === "llm") return p.includes("llm") || c === "geo";
  if (tab === "google") return p.includes("google") || c === "authority";
  if (tab === "website") return p.includes("website") || c === "technical";
  if (tab === "competitor") return p.includes("competitor") || c === "positioning";
  return true;
}

export default function RecommendationsPage() {
  const { selectedBrandId } = useSelectedBrand();
  const completed = useDashboardStore((s) => s.recommendationCompleted);
  const toggle = useDashboardStore((s) => s.toggleRecommendationDone);
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [tab, setTab] = useState<TabKey>("all");
  const [items, setItems] = useState<RecommendationEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiRecs, setAiRecs] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      impact_score: number | null;
      action_items: string[] | null;
    }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        brandId: selectedBrandId,
        limit: "50",
        offset: "0",
      });
      const res = await fetch(`/api/recommendations?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as {
        recommendations?: RecommendationEntity[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setItems(json.recommendations ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  const loadAi = useCallback(async () => {
    if (!selectedBrandId) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/visibility/recommendations?brandId=${selectedBrandId}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { recommendations?: typeof aiRecs };
      setAiRecs(json.recommendations ?? []);
    } catch {
      setAiRecs([]);
    } finally {
      setAiLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
    void loadAi();
  }, [load, loadAi]);

  async function handleRegenerateAi() {
    if (!selectedBrandId || aiGenerating) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/visibility/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Generate failed");
      toast.success("AI recommendations updated");
      await loadAi();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setAiGenerating(false);
    }
  }

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (priority !== "all" && r.priority !== priority) return false;
      const done = !!completed[r.id] || r.status === "completed";
      if (status === "pending" && done) return false;
      if (status === "done" && !done) return false;
      if (!tabMatch(tab, r)) return false;
      return true;
    });
  }, [items, priority, status, tab, completed]);

  const doneCount = items.filter((r) => !!completed[r.id] || r.status === "completed").length;

  async function handleGenerate() {
    if (!selectedBrandId) {
      toast.error("Select a client first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      const json = (await res.json()) as { jobId?: string; status?: string; note?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Generate failed");
      if (json.status === "queued" && json.jobId) {
        toast.success("Recommendations queued. Refresh in a few seconds.");
      } else {
        toast.message(json.note ?? "Check Redis for background workers.");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          <p className="text-sm text-neutral-500">Prioritized plays from your data and AI drafts.</p>
          <p className="mt-2 text-sm text-neutral-400">
            Progress: <span className="font-mono text-white">{doneCount}</span> of{" "}
            <span className="font-mono text-white">{total}</span> completed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={generating} onClick={() => void handleGenerate()}>
            {generating ? "Queueing…" : "Generate recommendations"}
          </Button>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}

      <Card className="border-[#262626] bg-[#111]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">AI visibility insights</h3>
              <p className="text-sm text-neutral-500">
                Source opportunities, sentiment fixes, and content gaps from LLM runs.
              </p>
            </div>
            <Button size="sm" variant="secondary" disabled={aiGenerating} onClick={() => void handleRegenerateAi()}>
              {aiGenerating ? "Generating…" : "Regenerate AI insights"}
            </Button>
          </div>
          {aiLoading ? (
            <p className="text-sm text-neutral-500">Loading AI recommendations…</p>
          ) : aiRecs.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No AI insights yet. Run prompts on LLM Visibility, then regenerate.
            </p>
          ) : (
            <div className="grid gap-3">
              {aiRecs.map((r) => (
                <div key={r.id} className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-medium text-white">{r.title}</h4>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded bg-[#262626] px-2 py-1 text-neutral-300">{r.priority}</span>
                      {r.impact_score != null ? (
                        <span className="rounded bg-[#262626] px-2 py-1 text-neutral-300">
                          Impact {r.impact_score}/100
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-neutral-400">{r.description}</p>
                  {r.action_items && r.action_items.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-400">
                      {r.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["llm", "LLM"],
            ["google", "Google"],
            ["website", "Website"],
            ["competitor", "Competitor"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={tab === value ? "secondary" : "ghost"}
            onClick={() => setTab(value as TabKey)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
          {!loading && !filtered.length ? (
            <Card className="border-[#262626] bg-[#111]">
              <CardContent className="p-6 text-sm text-neutral-400">
                No recommendations in this tab yet. Try another tab or generate new ones.
              </CardContent>
            </Card>
          ) : (
            filtered.map((r) => (
              <RecommendationCard
                key={r.id}
                title={r.title}
                pattern={r.pattern}
                priority={r.priority}
                actions={r.actions}
                impact={r.impact}
                done={!!completed[r.id] || r.status === "completed"}
                onToggle={() => toggle(r.id)}
              />
            ))
          )}
      </div>
    </div>
  );
}

function RecommendationCard({
  title,
  pattern,
  priority,
  actions,
  impact,
  done,
  onToggle,
}: {
  title: string;
  pattern: string;
  priority: string;
  actions: string[];
  impact: string;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={cn("border-[#262626]", done && "opacity-60")}>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
              [{priority.toUpperCase()}]
            </span>
            <p className="mt-1 text-xs text-neutral-500">Source: {pattern.replace(/_/g, " ")}</p>
            <h3 className="mt-2 text-base font-medium text-white">{title}</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-300">
              {actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-emerald-400">{impact}</p>
          </div>
          <Button size="sm" variant={done ? "ghost" : "secondary"} type="button" onClick={onToggle}>
            {done ? "Mark pending" : "Mark done"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
