"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RankPositionChart } from "@/components/charts/RankPositionChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_BRAND } from "@/lib/demo/seed-data";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";

type GoogleSummary = {
  avgPosition: number;
  clicks: number;
  impressions: number;
  ctr: number;
};

type KeywordRow = { keyword: string; position: number; clicks: number; impressions: number };

type GoogleRankingsApi = {
  source: "demo" | "live";
  empty?: boolean;
  summary: GoogleSummary | null;
  trend: { label: string; position: number }[];
  topKeywords: KeywordRow[];
  page23: KeywordRow[];
  lastSyncedAt: string | null;
  requestId?: string;
  error?: string;
};

export default function GoogleRankingsPage() {
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GoogleRankingsApi | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ brandId: selectedBrandId, range });
      const res = await fetch(`/api/google-rankings?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as GoogleRankingsApi;
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load rankings");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const siteName = brandName || DEMO_BRAND.name;
  const s = data?.summary;
  const lastSync = data?.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Google rankings</h2>
          <p className="text-sm text-neutral-500">
            Search performance from your connected property when Google Search Console is linked.
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
          {data?.source ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {data.source === "demo" ? "Demo" : "Live"}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-xs">
            Site: {siteName.toLowerCase()}.com
          </Badge>
        </div>
      </div>

      {lastSync ? (
        <p className="text-xs text-neutral-500">
          Last synced: <span className="text-neutral-300">{lastSync}</span>
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading rankings…</p>
      ) : error ? (
        <Card className="border-red-900/50 bg-[#111]">
          <CardContent className="p-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      ) : data?.empty && data.source === "live" ? (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">No ranking rows yet</CardTitle>
            <p className="text-sm text-neutral-500">
              Connect Google Search Console and run a sync to import queries and pages.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard/settings/api-keys">Connect Search Console</Link>
            </Button>
          </CardContent>
        </Card>
      ) : s ? (
        <>
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Avg position" value={String(s.avgPosition)} hint="Lower is better" delta="Rolling window" />
                <Metric label="Clicks" value={s.clicks.toLocaleString()} delta="In selected range" />
                <Metric label="Impressions" value={`${(s.impressions / 1000).toFixed(1)}K`} delta="In selected range" />
                <Metric label="CTR" value={`${(s.ctr * 100).toFixed(1)}%`} delta="Clicks ÷ impressions" />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-[#262626] bg-[#111] p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base text-white">Rank trend</CardTitle>
              <p className="text-sm text-neutral-500">Average position by day (weighted by impressions).</p>
            </CardHeader>
            <RankPositionChart
              data={
                data.trend.length
                  ? data.trend
                  : [{ label: "—", position: 0 }]
              }
            />
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Top keywords</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="p-3">Keyword</th>
                    <th className="p-3">Position</th>
                    <th className="p-3">Clicks</th>
                    <th className="p-3">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {data.topKeywords.map((k) => (
                    <tr key={k.keyword}>
                      <td className="p-3">
                        <Link
                          href={`/dashboard/google-rankings/${encodeURIComponent(k.keyword)}`}
                          className="font-medium text-white underline-offset-2 hover:underline"
                        >
                          {k.keyword}
                        </Link>
                      </td>
                      <td className="p-3 font-mono">{k.position}</td>
                      <td className="p-3 font-mono">{k.clicks.toLocaleString()}</td>
                      <td className="p-3 font-mono">{k.impressions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Keywords on page 2–3</CardTitle>
              <p className="text-sm text-neutral-500">Ranks 11–30 are often quick wins with stronger content and links.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="p-3">Keyword</th>
                    <th className="p-3">Position</th>
                    <th className="p-3">Next step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {data.page23.length ? (
                    data.page23.map((k) => (
                      <tr key={k.keyword}>
                        <td className="p-3">
                          <Link
                            href={`/dashboard/google-rankings/${encodeURIComponent(k.keyword)}`}
                            className="text-white underline-offset-2 hover:underline"
                          >
                            {k.keyword}
                          </Link>
                        </td>
                        <td className="p-3 font-mono">{k.position}</td>
                        <td className="p-3 text-neutral-400">Expand content, add FAQs, earn relevant links.</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-neutral-500" colSpan={3}>
                        No page-two keywords in this window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-neutral-500">No data.</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta: string;
}) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
      <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-2xl text-white">{value}</p>
      {hint ? <p className="text-xs text-neutral-600">{hint}</p> : null}
      <p className="mt-2 text-xs text-emerald-400">{delta}</p>
    </div>
  );
}
