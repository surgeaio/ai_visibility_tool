"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runGscSyncForBrand } from "@/lib/client/gsc-sync";
import { fetchJson } from "@/lib/client/fetch-json";
import { formatGscClicks, formatGscCtr, formatGscImpressions, formatGscPosition } from "@/lib/google-rankings/format";
import { googleRankingsRangeToDays } from "@/lib/google-rankings/gsc-dates";
import { gscTheme } from "@/lib/google-rankings/theme";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { GoogleRankingsEmptyState } from "@/components/google-rankings/EmptyState";
import { GoogleRankingsLoadingSkeleton } from "@/components/google-rankings/LoadingSkeleton";
import { MetricCard } from "@/components/google-rankings/MetricCard";
import { PerformanceChart } from "@/components/google-rankings/PerformanceChart";
import {
  CountriesCard,
  DevicesCard,
  SearchAppearanceCard,
} from "@/components/google-rankings/BreakdownCards";
import {
  formatPct,
  formatPos,
  PageLink,
  QueryLink,
  RankingsTable,
} from "@/components/google-rankings/RankingsTable";

type Range = "7d" | "30d" | "90d";

type ApiPayload = {
  connected?: boolean;
  empty?: boolean;
  property?: string;
  googleEmail?: string | null;
  lastSyncedAt?: string | null;
  brandName?: string;
  dateRange?: { startDate: string; endDate: string };
  searchType?: string;
  error?: string;
  summary?: {
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
    indexedPages: number;
    notIndexedPages: number;
  };
  comparison?: {
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    position: number | null;
  };
  trend?: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
  tables?: {
    queries: { items: Array<{ keyword: string; url?: string; clicks: number; impressions: number; ctr: number; position: number }>; page: number; totalPages: number; total: number };
    pages: { items: Array<{ url: string; clicks: number; impressions: number; ctr: number; position: number }>; page: number; totalPages: number; total: number };
    page23: { items: Array<{ keyword: string; url?: string; clicks: number; impressions: number; ctr: number; position: number }>; page: number; totalPages: number; total: number };
  };
  countries?: Array<{ country: string; clicks: number; impressions: number; share: number }>;
  devices?: Array<{ device: string; clicks: number; impressions: number; share: number }>;
  searchAppearance?: Array<{ type: string; clicks: number; impressions: number }>;
};

export function GoogleRankingsDashboard() {
  const { selectedBrandId } = useSelectedBrand();
  const [range, setRange] = useState<Range>("30d");
  const [queriesPage, setQueriesPage] = useState(1);
  const [pagesPage, setPagesPage] = useState(1);
  const [page23Page, setPage23Page] = useState(1);
  const [loading, setLoading] = useState(true);
  const [gscConnected, setGscConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  const checkGscConnection = useCallback(async (brandId: string) => {
    const res = await fetch(`/api/gsc/status?brandId=${encodeURIComponent(brandId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { connected?: boolean };
    return Boolean(json.connected);
  }, []);

  const load = useCallback(async () => {
    if (!selectedBrandId) {
      setData(null);
      setGscConnected(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    const connected = await checkGscConnection(selectedBrandId);
    setGscConnected(connected);
    if (!connected) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      brandId: selectedBrandId,
      range,
      queriesPage: String(queriesPage),
      pagesPage: String(pagesPage),
      page23Page: String(page23Page),
      pageSize: "10",
    });
    const res = await fetchJson<ApiPayload>(`/api/google-rankings?${params}`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.error);
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [selectedBrandId, range, queriesPage, pagesPage, page23Page, checkGscConnection]);

  useEffect(() => {
    setQueriesPage(1);
    setPagesPage(1);
    setPage23Page(1);
    setGscConnected(null);
    setData(null);
  }, [selectedBrandId, range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast.success("Search Console connected.");
      window.history.replaceState({}, "", "/dashboard/google-rankings");
      void load();
    }
    const err = params.get("error");
    if (err) {
      toast.error(`Connection failed: ${err.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", "/dashboard/google-rankings");
    }
  }, [load]);

  async function runGscSync() {
    if (!selectedBrandId) return;
    setSyncBusy(true);
    const tid = toast.loading("Syncing Search Console…");
    try {
      await runGscSyncForBrand(selectedBrandId, googleRankingsRangeToDays(range));
      toast.dismiss(tid);
      toast.success("Sync complete");
      setQueriesPage(1);
      setPagesPage(1);
      setPage23Page(1);
      void load();
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncBusy(false);
    }
  }

  if (!selectedBrandId) {
    return <GoogleRankingsEmptyState variant="no-brand" />;
  }

  if (loading && !data) {
    return <GoogleRankingsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className={`${gscTheme.surface} p-6 text-sm text-red-300`}>
        {error}
        <Button className="mt-4" size="sm" variant="secondary" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  if (gscConnected === false || !data?.connected) {
    return <GoogleRankingsEmptyState variant="not-connected" brandId={selectedBrandId} />;
  }

  if (data.empty || !data.summary) {
    return (
      <GoogleRankingsEmptyState
        variant="no-data"
        brandId={selectedBrandId}
        onSync={() => void runGscSync()}
        syncBusy={syncBusy}
      />
    );
  }

  const s = data.summary;
  const cmp = data.comparison;
  const trend = data.trend ?? [];
  const sparkClicks = trend.map((t) => t.clicks);
  const sparkImpressions = trend.map((t) => t.impressions);
  const sparkCtr = trend.map((t) => t.ctr * 100);
  const sparkPos = trend.map((t) => t.position);

  return (
    <div className={gscTheme.page}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={gscTheme.header}>Search performance</h1>
          <p className={`mt-1 ${gscTheme.subheader}`}>
            Real Google Search Console data for{" "}
            <span className="text-neutral-200">{data.brandName ?? "this client"}</span>
          </p>
          {data.property ? (
            <p className="mt-1 text-xs text-neutral-500">
              Property <span className="text-neutral-400">{data.property}</span>
              {data.dateRange ? (
                <>
                  {" "}
                  · {data.dateRange.startDate} – {data.dateRange.endDate}
                </>
              ) : null}
              {data.searchType ? <> · Web search</> : null}
              {data.googleEmail ? <> · {data.googleEmail}</> : null}
              {data.lastSyncedAt ? (
                <> · Last sync {new Date(data.lastSyncedAt).toLocaleString()}</>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-white"
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            aria-label="Date range"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 28 days</option>
            <option value="90d">Last 3 months</option>
          </select>
          <Button type="button" size="sm" variant="secondary" disabled={syncBusy} onClick={() => void runGscSync()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncBusy ? "animate-spin" : ""}`} />
            {syncBusy ? "Syncing…" : "Re-sync"}
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/search-rankings">Query explorer</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total clicks"
          value={formatGscClicks(s.clicks)}
          change={cmp?.clicks ?? null}
          sparkline={sparkClicks}
        />
        <MetricCard
          label="Total impressions"
          value={formatGscImpressions(s.impressions)}
          change={cmp?.impressions ?? null}
          sparkline={sparkImpressions}
        />
        <MetricCard
          label="Average CTR"
          value={formatGscCtr(s.ctr)}
          change={cmp?.ctr ?? null}
          sparkline={sparkCtr}
        />
        <MetricCard
          label="Average position"
          value={formatGscPosition(s.avgPosition)}
          change={cmp?.position ?? null}
          sparkline={sparkPos}
          invertTrend
        />
      </div>

      <section className={`${gscTheme.surface} p-5`}>
        <h2 className="mb-4 text-base font-semibold text-white">Performance</h2>
        <PerformanceChart data={trend} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {data.tables ? (
          <>
            <RankingsTable
              title="Top pages"
              subtitle="Pages with the most search traffic"
              rows={data.tables.pages.items}
              rowKey={(r) => r.url}
              columns={[
                { key: "url", header: "Page", render: (r) => <PageLink url={r.url} /> },
                { key: "clicks", header: "Clicks", align: "right", render: (r) => r.clicks.toLocaleString() },
                { key: "impr", header: "Impressions", align: "right", render: (r) => r.impressions.toLocaleString() },
                { key: "ctr", header: "CTR", align: "right", render: (r) => formatPct(r.ctr) },
                { key: "pos", header: "Position", align: "right", render: (r) => formatPos(r.position) },
              ]}
              pagination={data.tables.pages}
              onPageChange={setPagesPage}
            />
            <RankingsTable
              title="Top queries"
              subtitle="Search terms driving traffic"
              rows={data.tables.queries.items}
              rowKey={(r) => r.keyword}
              columns={[
                { key: "q", header: "Query", render: (r) => <QueryLink keyword={r.keyword} /> },
                { key: "clicks", header: "Clicks", align: "right", render: (r) => r.clicks.toLocaleString() },
                { key: "impr", header: "Impressions", align: "right", render: (r) => r.impressions.toLocaleString() },
                { key: "ctr", header: "CTR", align: "right", render: (r) => formatPct(r.ctr) },
                { key: "pos", header: "Position", align: "right", render: (r) => formatPos(r.position) },
              ]}
              pagination={data.tables.queries}
              onPageChange={setQueriesPage}
            />
          </>
        ) : null}
      </div>

      {data.tables ? (
        <RankingsTable
          title="Keywords on page 2–3"
          subtitle="Positions 11–30 — often the fastest wins"
          rows={data.tables.page23.items}
          rowKey={(r) => `${r.keyword}-${r.url}`}
          columns={[
            { key: "q", header: "Keyword", render: (r) => <QueryLink keyword={r.keyword} /> },
            { key: "pos", header: "Position", align: "right", render: (r) => formatPos(r.position) },
            { key: "clicks", header: "Clicks", align: "right", render: (r) => r.clicks.toLocaleString() },
            { key: "impr", header: "Impressions", align: "right", render: (r) => r.impressions.toLocaleString() },
            {
              key: "url",
              header: "URL",
              render: (r) => (r.url ? <PageLink url={r.url} /> : "—"),
            },
          ]}
          pagination={data.tables.page23}
          onPageChange={setPage23Page}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <CountriesCard items={data.countries ?? []} />
        <DevicesCard items={data.devices ?? []} />
        <SearchAppearanceCard items={data.searchAppearance ?? []} />
      </div>
    </div>
  );
}
