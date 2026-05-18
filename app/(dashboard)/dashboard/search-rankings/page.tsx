"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelectedBrand } from "@/lib/context/brand-context";

type RankingRow = {
  query: string;
  page_url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  positionChange?: number | null;
};

type Suggestion = {
  id: string;
  suggestion_type: string;
  priority: string;
  title: string;
  description: string;
  action_items: string[];
  query?: string | null;
  page_url?: string | null;
};

export default function SearchRankingsPage() {
  const { selectedBrandId } = useSelectedBrand();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState<"all" | "top10" | "11-30" | "31-100">("all");
  const [syncBusy, setSyncBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search-rankings?brandId=${selectedBrandId}`, { cache: "no-store" });
      const data = (await res.json()) as {
        connected?: boolean;
        rankings?: RankingRow[];
        suggestions?: Suggestion[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConnected(Boolean(data.connected));
      setRankings(data.rankings ?? []);
      setSuggestions(
        (data.suggestions ?? []).map((s) => ({
          ...s,
          action_items: Array.isArray(s.action_items) ? s.action_items : [],
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to load rankings");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRankings = rankings.filter((r) => {
    if (
      filter &&
      !r.query.toLowerCase().includes(filter.toLowerCase()) &&
      !r.page_url.toLowerCase().includes(filter.toLowerCase())
    ) {
      return false;
    }
    if (positionFilter === "top10" && r.position > 10) return false;
    if (positionFilter === "11-30" && (r.position <= 10 || r.position > 30)) return false;
    if (positionFilter === "31-100" && (r.position <= 30 || r.position > 100)) return false;
    return true;
  });

  const connectHref = selectedBrandId
    ? `/api/auth/google?brandId=${encodeURIComponent(selectedBrandId)}`
    : "#";

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading search rankings…</p>;
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Search Rankings</h1>
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-white">Connect Google Search Console</CardTitle>
            <p className="text-sm text-neutral-400">
              See where your brand appears on Google — every query, ranking page, and improvement tips.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={connectHref}>Connect Search Console</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Search Rankings</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Every query your site ranks for, with positions, traffic, and improvement ideas.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={syncBusy}
          onClick={async () => {
            if (!selectedBrandId) return;
            setSyncBusy(true);
            try {
              const res = await fetch("/api/gsc/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brandId: selectedBrandId }),
              });
              if (!res.ok) {
                const j = (await res.json()) as { error?: string };
                throw new Error(j.error ?? "Sync failed");
              }
              toast.success("Sync complete");
              void load();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Sync failed");
            } finally {
              setSyncBusy(false);
            }
          }}
        >
          {syncBusy ? "Syncing…" : "Re-sync GSC data"}
        </Button>
      </div>

      <Tabs defaultValue="rankings">
        <TabsList className="border border-[#262626] bg-[#111]">
          <TabsTrigger value="rankings">All Rankings ({rankings.length})</TabsTrigger>
          <TabsTrigger value="suggestions">Improvement Ideas ({suggestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Filter queries or URLs…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-md border-[#262626] bg-[#111]"
            />
            <div className="flex flex-wrap gap-1">
              {(["all", "top10", "11-30", "31-100"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={positionFilter === p ? "default" : "secondary"}
                  onClick={() => setPositionFilter(p)}
                >
                  {p === "all" ? "All positions" : `Pos ${p}`}
                </Button>
              ))}
            </div>
          </div>

          <Card className="border-[#262626] bg-[#111]">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#262626] text-left text-neutral-500">
                    <th className="px-4 py-3">Query</th>
                    <th className="px-4 py-3">Ranking page</th>
                    <th className="px-4 py-3 text-right">Position</th>
                    <th className="px-4 py-3 text-right">Δ (wk)</th>
                    <th className="px-4 py-3 text-right">Clicks</th>
                    <th className="px-4 py-3 text-right">Impressions</th>
                    <th className="px-4 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRankings.slice(0, 100).map((r, i) => (
                    <tr
                      key={`${r.query}-${r.page_url}-${i}`}
                      className="border-b border-[#262626] text-white hover:bg-[#1a1a1a]"
                    >
                      <td className="px-4 py-3">{r.query}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-neutral-400">
                        <a href={r.page_url} target="_blank" rel="noreferrer" className="hover:text-white">
                          {safePathname(r.page_url)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={
                            r.position <= 10
                              ? "text-green-400"
                              : r.position <= 30
                                ? "text-yellow-400"
                                : "text-red-400"
                          }
                        >
                          {r.position.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {r.positionChange != null ? (
                          <span
                            className={
                              r.positionChange > 0
                                ? "text-green-400"
                                : r.positionChange < 0
                                  ? "text-red-400"
                                  : "text-neutral-500"
                            }
                          >
                            {r.positionChange > 0 ? "+" : ""}
                            {r.positionChange.toFixed(1)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{r.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{r.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{(r.ctr * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRankings.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">No queries match the filter.</div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card className="border-[#262626] bg-[#111]">
              <CardContent className="p-8 text-center text-neutral-500">
                No suggestions yet. Generate AI-powered tips from your ranking data.
                <div className="mt-4">
                  <Button
                    disabled={genBusy}
                    onClick={async () => {
                      if (!selectedBrandId) return;
                      setGenBusy(true);
                      try {
                        const res = await fetch("/api/search-rankings/generate-suggestions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ brandId: selectedBrandId }),
                        });
                        const j = (await res.json()) as { generated?: number; error?: string };
                        if (!res.ok) throw new Error(j.error ?? "Failed");
                        toast.success(`Generated ${j.generated ?? 0} suggestions`);
                        void load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Generation failed");
                      } finally {
                        setGenBusy(false);
                      }
                    }}
                  >
                    {genBusy ? "Generating…" : "Generate AI Suggestions"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            suggestions.map((s) => (
              <Card key={s.id} className="border-[#262626] bg-[#111]">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        s.priority === "high"
                          ? "bg-red-900/30 text-red-400"
                          : s.priority === "medium"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-blue-900/30 text-blue-400"
                      }`}
                    >
                      {s.priority.toUpperCase()}
                    </span>
                    <CardTitle className="text-base text-white">{s.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-neutral-400">{s.description}</p>
                  {s.action_items.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                      {s.action_items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  {(s.query || s.page_url) && (
                    <div className="border-t border-[#262626] pt-2 text-xs text-neutral-500">
                      {s.query ? (
                        <>
                          Query: <span className="text-neutral-300">{s.query}</span>
                          {" · "}
                        </>
                      ) : null}
                      {s.page_url ? (
                        <a
                          href={s.page_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-300 hover:text-white"
                        >
                          {s.page_url}
                        </a>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
