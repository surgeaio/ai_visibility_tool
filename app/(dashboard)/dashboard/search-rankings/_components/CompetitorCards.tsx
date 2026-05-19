"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Target, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelectedBrand } from "@/lib/context/brand-context";

type WinningFactor = { factor?: string; evidence?: string };
type ActionItem = { priority?: string; action?: string; expected_impact?: string; competitor?: string };
type CompetitorData = {
  summary?: {
    totalClicks?: number;
    totalImpressions?: number;
    avgPosition?: number;
    topQueries?: Array<{ query: string; clicks?: number; position?: number }>;
  };
  competitors?: Array<{ id: string; competitor_domain: string; detection_score?: number }>;
  analyses?: Array<{ winning_factors?: WinningFactor[] }>;
  actionItems?: ActionItem[];
  hasAnalysis?: boolean;
};

export function CompetitorCards() {
  const { selectedBrandId } = useSelectedBrand();
  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/competitor-intelligence?brandId=${selectedBrandId}`, { cache: "no-store" });
      const json = (await res.json()) as CompetitorData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAnalysis() {
    if (!selectedBrandId) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/competitor-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });
      const json = (await res.json()) as {
        error?: string;
        detection?: { count?: number };
        rankings?: { ranked?: number };
        analysis?: { generated?: number };
      };
      if (!res.ok) {
        toast.error(json.error ?? "Analysis failed");
        return;
      }
      toast.success(
        `Analysis complete: ${json.detection?.count ?? 0} competitors, ${json.rankings?.ranked ?? 0} rankings, ${json.analysis?.generated ?? 0} AI reports`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setAnalyzing(false);
    }
  }

  if (!selectedBrandId) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-64 animate-pulse border-[#262626] bg-[#111]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Competitive Intelligence</h2>
        <Button size="sm" variant="secondary" onClick={() => void runAnalysis()} disabled={analyzing}>
          {analyzing ? "Analyzing…" : data?.hasAnalysis ? "Re-run Analysis" : "Run Analysis"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-neutral-300">Your Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-2xl font-bold text-white">
                {data?.summary?.totalClicks?.toLocaleString() ?? 0}
              </div>
              <p className="text-xs text-neutral-500">Total clicks (30d)</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[#262626] pt-2 text-xs">
              <div>
                <div className="font-medium text-white">
                  {data?.summary?.totalImpressions?.toLocaleString() ?? 0}
                </div>
                <div className="text-neutral-500">Impressions</div>
              </div>
              <div>
                <div className="font-medium text-white">{data?.summary?.avgPosition?.toFixed(1) ?? "—"}</div>
                <div className="text-neutral-500">Avg position</div>
              </div>
            </div>
            {(data?.summary?.topQueries?.length ?? 0) > 0 && (
              <div className="border-t border-[#262626] pt-2">
                <p className="mb-1 text-xs text-neutral-500">Top query</p>
                <p className="truncate text-xs text-white">{data!.summary!.topQueries![0].query}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#262626] bg-[#111]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-neutral-300">Competitors</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-2xl font-bold text-white">{data?.competitors?.length ?? 0}</div>
              <p className="text-xs text-neutral-500">Auto-detected from your queries</p>
            </div>
            {(data?.competitors?.length ?? 0) > 0 ? (
              <div className="space-y-1 border-t border-[#262626] pt-2">
                {data!.competitors!.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="truncate text-white">{c.competitor_domain}</span>
                    <span className="text-red-400">+{Math.round(Number(c.detection_score ?? 0))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-[#262626] pt-2 text-xs text-neutral-500">
                Click Run Analysis to detect competitors
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#262626] bg-[#111]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-neutral-300">Why They Win</CardTitle>
              <Lightbulb className="h-4 w-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-2xl font-bold text-white">
                {data?.analyses?.[0]?.winning_factors?.length ?? 0}
              </div>
              <p className="text-xs text-neutral-500">Winning factors identified</p>
            </div>
            {(data?.analyses?.[0]?.winning_factors?.length ?? 0) > 0 ? (
              <div className="space-y-1 border-t border-[#262626] pt-2">
                {data!.analyses![0].winning_factors!.slice(0, 2).map((f, i) => (
                  <p key={i} className="text-xs text-white">
                    {f.factor}
                  </p>
                ))}
              </div>
            ) : (
              <p className="border-t border-[#262626] pt-2 text-xs text-neutral-500">AI analysis pending</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#262626] bg-[#111]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-neutral-300">Action Items</CardTitle>
              <Target className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-2xl font-bold text-white">{data?.actionItems?.length ?? 0}</div>
              <p className="text-xs text-neutral-500">Prioritized recommendations</p>
            </div>
            {(data?.actionItems?.length ?? 0) > 0 ? (
              <div className="space-y-1 border-t border-[#262626] pt-2">
                {data!.actionItems!.slice(0, 2).map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <span
                      className={`mt-0.5 rounded px-1 text-[10px] ${
                        a.priority === "high"
                          ? "bg-red-900/30 text-red-400"
                          : a.priority === "medium"
                            ? "bg-yellow-900/30 text-yellow-400"
                            : "bg-blue-900/30 text-blue-400"
                      }`}
                    >
                      {a.priority?.[0]?.toUpperCase() ?? "M"}
                    </span>
                    <span className="truncate text-white">{a.action}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-[#262626] pt-2 text-xs text-neutral-500">
                Run analysis to generate recommendations
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {data?.hasAnalysis && (data.actionItems?.length ?? 0) > 0 && (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">Full Action Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.actionItems!.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 border-b border-[#262626] pb-3 last:border-0"
                >
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      item.priority === "high"
                        ? "bg-red-900/30 text-red-400"
                        : item.priority === "medium"
                          ? "bg-yellow-900/30 text-yellow-400"
                          : "bg-blue-900/30 text-blue-400"
                    }`}
                  >
                    {item.priority?.toUpperCase() ?? "MEDIUM"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.action}</p>
                    {item.expected_impact && (
                      <p className="mt-1 text-xs text-neutral-500">Expected: {item.expected_impact}</p>
                    )}
                    {item.competitor && (
                      <p className="mt-1 text-xs text-neutral-600">vs {item.competitor}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
