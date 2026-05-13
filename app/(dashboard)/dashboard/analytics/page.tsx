"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_BRAND_ID,
  DEMO_CHART_DATA,
  DEMO_LLM_FORECAST_SERIES,
  DEMO_KEYWORD_RANK_FORECAST,
} from "@/lib/demo/seed-data";

const multiTrend = DEMO_CHART_DATA.visibility.map((row) => ({
  label: row.month,
  you: row.attio,
  hubspot: row.hubspot,
  salesforce: row.salesforce,
}));

type Descriptive = {
  source: "demo" | "live";
  llm: { overall: number | null; runs: number };
  google: { avgPosition: number; clicks: number; impressions: number; ctr: number } | null;
  website: { overallScore: number; critical: number; warnings: number; totalPages: number } | null;
};

type Diagnostic = {
  source: "demo" | "live";
  reasons: string[];
  llmDeltaPct: number | null;
};

type Predictive = {
  source: "demo" | "live";
  llmForecast: { label: string; score: number }[];
  keywordForecast: { keyword: string; now: number; d30: number; d60: number }[];
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [descriptive, setDescriptive] = useState<Descriptive | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [predictive, setPredictive] = useState<Predictive | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ brandId: DEMO_BRAND_ID, range: "30d" });
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [dRes, dgRes, pRes] = await Promise.all([
          fetch(`/api/analytics/descriptive?${q}`, { cache: "no-store" }),
          fetch(`/api/analytics/diagnostic?${q}`, { cache: "no-store" }),
          fetch(`/api/analytics/predictive?${q}`, { cache: "no-store" }),
        ]);
        const [d, dg, p] = (await Promise.all([dRes.json(), dgRes.json(), pRes.json()])) as [
          Descriptive,
          Diagnostic,
          Predictive,
        ];
        if (!cancelled) {
          setDescriptive(d);
          setDiagnostic(dg);
          setPredictive(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const d = descriptive;
  const dg = diagnostic;
  const p = predictive;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
        <p className="text-sm text-neutral-500">
          Three layers: what happened, why it moved, and a simple forward view (live when data exists).
        </p>
        {loading ? <p className="mt-2 text-xs text-neutral-500">Loading analytics…</p> : null}
      </div>

      <Tabs defaultValue="descriptive" className="w-full">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="descriptive">Descriptive</TabsTrigger>
          <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
        </TabsList>

        <TabsContent value="descriptive" className="space-y-6">
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">What happened in the last 30 days?</CardTitle>
              {d?.source === "live" ? (
                <p className="text-xs text-neutral-500">Live aggregates from your database.</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-neutral-300">
              <section>
                <p className="font-medium text-white">LLM visibility</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Average visibility score:{" "}
                    <span className="font-mono text-white">{d?.llm.overall ?? "—"}</span>
                    {d?.llm.overall != null ? "/100" : null}
                  </li>
                  <li>
                    Stored runs in window: <span className="font-mono text-white">{d?.llm.runs ?? 0}</span>
                  </li>
                </ul>
              </section>
              <section>
                <p className="font-medium text-white">Google Search</p>
                {d?.google ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Average position: {d.google.avgPosition}</li>
                    <li>Clicks: {d.google.clicks.toLocaleString()}</li>
                    <li>Impressions: {d.google.impressions.toLocaleString()}</li>
                    <li>CTR: {(d.google.ctr * 100).toFixed(2)}%</li>
                  </ul>
                ) : (
                  <p className="mt-2 text-neutral-500">No ranking rows in this window yet.</p>
                )}
              </section>
              <section>
                <p className="font-medium text-white">Website</p>
                {d?.website ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Overall audit score: {d.website.overallScore}/100</li>
                    <li>Critical issues: {d.website.critical}</li>
                    <li>Warnings: {d.website.warnings}</li>
                    <li>Pages in last crawl: {d.website.totalPages}</li>
                  </ul>
                ) : (
                  <p className="mt-2 text-neutral-500">No completed crawl yet.</p>
                )}
              </section>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-[#262626] bg-[#111] p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base text-white">Visibility vs competitors (demo months)</CardTitle>
            </CardHeader>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3" }} />
                  <Line type="monotone" dataKey="you" name="You" stroke="#ffffff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="hubspot" name="HubSpot" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="salesforce" name="Salesforce" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostic" className="space-y-6">
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Why did these results happen?</CardTitle>
              {dg?.llmDeltaPct != null ? (
                <p className="text-xs text-neutral-500">LLM half-over-half change: {dg.llmDeltaPct}%</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-300">
              <ul className="list-disc space-y-2 pl-5">
                {(dg?.reasons ?? []).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">What might happen next?</CardTitle>
              <p className="text-sm text-neutral-500">Simple trend extension on LLM scores — not a guarantee.</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-300">
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(p?.llmForecast?.length ? p.llmForecast : DEMO_LLM_FORECAST_SERIES) as { label: string; score: number }[]}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" name="LLM score" stroke="#a78bfa" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Keyword rank outlook</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="p-3">Keyword</th>
                    <th className="p-3">Now</th>
                    <th className="p-3">30d</th>
                    <th className="p-3">60d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {(p?.keywordForecast?.length ? p.keywordForecast : DEMO_KEYWORD_RANK_FORECAST).map((k) => (
                    <tr key={k.keyword}>
                      <td className="p-3 text-white">{k.keyword}</td>
                      <td className="p-3 font-mono">{k.now}</td>
                      <td className="p-3 font-mono">{k.d30}</td>
                      <td className="p-3 font-mono">{k.d60}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
