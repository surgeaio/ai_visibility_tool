"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformComparisonChart } from "@/components/charts/PlatformComparisonChart";
import { VisibilityTrendChart } from "@/components/charts/VisibilityTrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LlmVisibilityPayload } from "@/lib/types/llm-visibility";
import { useSelectedBrand } from "@/lib/context/brand-context";

type ApiLlmResponse = {
  source: "demo" | "live";
  data: LlmVisibilityPayload;
  requestId?: string;
};

function sentimentLabel(s: "positive" | "neutral" | "negative") {
  if (s === "positive") return { text: "Positive", emoji: "😊" };
  if (s === "negative") return { text: "Needs work", emoji: "😟" };
  return { text: "Neutral", emoji: "😐" };
}

export default function LlmVisibilityPage() {
  const { selectedBrandId } = useSelectedBrand();
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"demo" | "live" | null>(null);
  const [payload, setPayload] = useState<LlmVisibilityPayload | null>(null);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ brandId: selectedBrandId, range });
      const res = await fetch(`/api/llm-visibility?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as ApiLlmResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load LLM visibility");
      }
      setSource(json.source);
      setPayload(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [range, selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const overall =
    payload?.overall ??
    (payload?.platformScores?.length
      ? Math.round(
          payload.platformScores.reduce((a, p) => a + p.score, 0) / payload.platformScores.length,
        )
      : null);

  const barData = (payload?.platformScores ?? []).map((p) => ({ name: p.platform, score: p.score }));
  const topPrompts = [...(payload?.topPrompts ?? [])].slice(0, 5);
  const needsAttention = payload?.needsAttention ?? [];
  const trend = payload?.trend ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">LLM visibility</h2>
          <p className="text-sm text-neutral-500">
            Where AI assistants mention your brand, and how strong those mentions feel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-[#262626] bg-[#111] px-2 py-1.5 text-sm text-white"
            value={range}
            onChange={(e) => setRange(e.target.value as "7d" | "30d" | "90d")}
            aria-label="Date range"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          {source ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {source === "demo" ? "Demo data" : "Live data"}
            </Badge>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading visibility…</p>
      ) : error ? (
        <Card className="border-red-900/50 bg-[#111]">
          <CardContent className="p-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      ) : payload?.empty ? (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">No LLM checks yet</CardTitle>
            <p className="text-sm text-neutral-500">
              Run a prompt with your provider keys to populate scores and sentiment.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard/prompts">Go to prompts</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Overall score</CardTitle>
              <p className="text-sm text-neutral-500">
                Average visibility across tracked assistants in this range.
              </p>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-4xl font-semibold text-white">
                {overall != null ? overall : "—"}
                {overall != null ? <span className="text-lg text-neutral-500">/100</span> : null}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {source === "demo" ? "Demo trend story — connect keys for live numbers." : "Based on stored runs."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(payload?.platformScores ?? []).map((p) => {
              const s = sentimentLabel(p.sentiment);
              return (
                <Card key={p.platform} className="border-[#262626] bg-[#111]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-400">{p.platform}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-mono text-2xl text-white">{p.score}/100</p>
                    <p className="text-sm text-neutral-400">
                      {s.emoji} {s.text}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <Card className="min-w-0 border-[#262626] bg-[#111] p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base text-white">Visibility trend</CardTitle>
                <p className="text-sm text-neutral-500">Daily highs per assistant (when history exists).</p>
              </CardHeader>
              <VisibilityTrendChart data={trend.length ? trend : [{ day: "—", chatgpt: 0, claude: 0, gemini: 0, perplexity: 0 }]} />
            </Card>
            <Card className="min-w-0 border-[#262626] bg-[#111] p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base text-white">Compare platforms</CardTitle>
                <p className="text-sm text-neutral-500">Scores from 0 (invisible) to 100 (strong presence).</p>
              </CardHeader>
              <PlatformComparisonChart data={barData.length ? barData : [{ name: "—", score: 0 }]} />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-[#262626] bg-[#111]">
              <CardHeader>
                <CardTitle className="text-base text-white">Top prompts</CardTitle>
                <p className="text-sm text-neutral-500">Highest average visibility score in this range.</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="p-3">Prompt</th>
                      <th className="p-3">Avg score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {topPrompts.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3">
                          <Link
                            href={`/dashboard/llm-visibility/${p.id}`}
                            className="text-white underline-offset-2 hover:underline"
                          >
                            {p.text}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-neutral-300">{p.avgScore ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-[#262626] bg-[#111]">
              <CardHeader>
                <CardTitle className="text-base text-white">Needs attention</CardTitle>
                <p className="text-sm text-neutral-500">Prompts that are weak or inconsistent across models.</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="p-3">Prompt</th>
                      <th className="p-3">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {needsAttention.length ? (
                      needsAttention.map((p) => (
                        <tr key={p.id}>
                          <td className="p-3">
                            <Link
                              href={`/dashboard/llm-visibility/${p.id}`}
                              className="text-white underline-offset-2 hover:underline"
                            >
                              {p.text}
                            </Link>
                          </td>
                          <td className="p-3 text-neutral-400">{p.issue}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-neutral-500" colSpan={2}>
                          Nothing flagged — nice work.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
