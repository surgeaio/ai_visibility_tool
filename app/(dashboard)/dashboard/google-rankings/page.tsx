"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RankPositionChart } from "@/components/charts/RankPositionChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runGscSyncForBrand } from "@/lib/client/gsc-sync";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";

type GoogleSummary = {
  avgPosition: number;
  clicks: number;
  impressions: number;
  ctr: number;
  indexedPages: number;
  notIndexedPages: number;
};

type KeywordRow = { keyword: string; position: number; clicks: number; impressions: number };
type PageRow = { url: string; clicks: number; impressions: number };

type GoogleRankingsApi = {
  connected: boolean;
  source?: "demo" | "live";
  empty?: boolean;
  property?: string;
  googleEmail?: string | null;
  summary: GoogleSummary | null;
  trend: { label: string; position: number }[];
  topKeywords: KeywordRow[];
  topPages: PageRow[];
  page23: KeywordRow[];
  lastSyncedAt: string | null;
  error?: string;
};

export default function GoogleRankingsPage() {
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GoogleRankingsApi | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [syncBusy, setSyncBusy] = useState(false);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ brandId: selectedBrandId, range });
      const res = await fetch(`/api/google-rankings?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as GoogleRankingsApi;
      if (!res.ok) throw new Error(json.error ?? "Failed to load rankings");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast.success("Google Search Console connected. Syncing data…");
    }
    const err = params.get("error");
    if (err) toast.error(`Connection failed: ${err.replace(/_/g, " ")}`);
  }, []);

  async function runGscSync() {
    if (!selectedBrandId) return;
    setSyncBusy(true);
    const tid = toast.loading("Syncing Search Console data…");
    try {
      const result = await runGscSyncForBrand(selectedBrandId);
      toast.dismiss(tid);
      if (result.status === "completed") {
        const failed = result.results.filter((r) => r.status === "failed").length;
        const ok = result.results[0];
        if (failed > 0) toast.warning("Sync completed with some errors.");
        else {
          toast.success(
            `Sync complete — ${ok?.dailyRows ?? 0} daily rows, ${ok?.queryRows ?? 0} query rows.`,
          );
        }
        void load();
      }
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncBusy(false);
    }
  }

  const s = data?.summary;
  const lastSync = data?.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;
  const connectHref = selectedBrandId
    ? `/api/auth/google?brandId=${encodeURIComponent(selectedBrandId)}`
    : "#";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Google rankings</h2>
          <p className="text-sm text-neutral-500">
            Live Search Console performance — clicks, impressions, CTR, position, and top queries.
          </p>
          {data?.property ? (
            <p className="mt-1 text-xs text-neutral-500">
              Property: <span className="text-neutral-300">{data.property}</span>
              {data.googleEmail ? (
                <>
                  {" "}
                  · <span className="text-neutral-300">{data.googleEmail}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data?.connected ? (
            <Button type="button" size="sm" variant="secondary" disabled={syncBusy} onClick={() => void runGscSync()}>
              {syncBusy ? "Syncing…" : "Re-sync now"}
            </Button>
          ) : null}
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
            {brandName || "Brand"}
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
      ) : !data?.connected ? (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">Connect Google Search Console</CardTitle>
            <p className="text-sm text-neutral-500">
              Link your Google account to import clicks, impressions, CTR, and query data.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={connectHref}>Connect Search Console</Link>
            </Button>
          </CardContent>
        </Card>
      ) : data.empty && !s ? (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">Connected — waiting for data</CardTitle>
            <p className="text-sm text-neutral-500">Run a sync to pull the latest metrics (30–60 seconds).</p>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" disabled={syncBusy} onClick={() => void runGscSync()}>
              {syncBusy ? "Syncing…" : "Sync now"}
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard/search-rankings">Search Rankings</Link>
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <Metric label="Avg position" value={String(s.avgPosition)} hint="Lower is better" />
                <Metric label="Clicks" value={s.clicks.toLocaleString()} />
                <Metric label="Impressions" value={s.impressions.toLocaleString()} />
                <Metric label="CTR" value={`${(s.ctr * 100).toFixed(2)}%`} />
                <Metric label="Indexed pages" value={String(s.indexedPages)} hint="With impressions" />
                <Metric label="Not indexed" value={String(s.notIndexedPages)} />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-[#262626] bg-[#111] p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base text-white">Rank trend</CardTitle>
            </CardHeader>
            <RankPositionChart data={data.trend.length ? data.trend : [{ label: "—", position: 0 }]} />
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Top queries</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <KeywordTable rows={data.topKeywords} />
            </CardContent>
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Top pages</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="p-3">Page</th>
                    <th className="p-3">Clicks</th>
                    <th className="p-3">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {data.topPages.map((p) => (
                    <tr key={p.url}>
                      <td className="max-w-md truncate p-3">
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-white hover:underline">
                          {safePathname(p.url)}
                        </a>
                      </td>
                      <td className="p-3 font-mono">{p.clicks.toLocaleString()}</td>
                      <td className="p-3 font-mono">{p.impressions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Keywords on page 2–3</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <KeywordTable rows={data.page23} compact />
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-neutral-500">No data.</p>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
      <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-2xl text-white">{value}</p>
      {hint ? <p className="text-xs text-neutral-600">{hint}</p> : null}
    </div>
  );
}

function KeywordTable({ rows, compact }: { rows: KeywordRow[]; compact?: boolean }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
        <tr>
          <th className="p-3">Keyword</th>
          <th className="p-3">Position</th>
          {!compact ? <th className="p-3">Clicks</th> : null}
          <th className="p-3">Impressions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#262626]">
        {rows.map((k) => (
          <tr key={k.keyword}>
            <td className="p-3">
              <Link
                href={`/dashboard/google-rankings/${encodeURIComponent(k.keyword)}`}
                className="font-medium text-white hover:underline"
              >
                {k.keyword}
              </Link>
            </td>
            <td className="p-3 font-mono">{k.position}</td>
            {!compact ? <td className="p-3 font-mono">{k.clicks.toLocaleString()}</td> : null}
            <td className="p-3 font-mono">{k.impressions.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
