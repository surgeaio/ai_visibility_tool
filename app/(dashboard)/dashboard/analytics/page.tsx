"use client";

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
  DEMO_CHART_DATA,
  DEMO_GOOGLE_SUMMARY,
  DEMO_KEYWORD_RANK_FORECAST,
  DEMO_LLM_FORECAST_SERIES,
  DEMO_LLM_PLATFORM_SCORES,
  DEMO_WEBSITE_AUDIT_SUMMARY,
} from "@/lib/demo/seed-data";

const multiTrend = DEMO_CHART_DATA.visibility.map((row) => ({
  label: row.month,
  you: row.attio,
  hubspot: row.hubspot,
  salesforce: row.salesforce,
}));

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
        <p className="text-sm text-neutral-500">Three layers: what happened, why, and what may happen next (demo).</p>
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
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-neutral-300">
              <section>
                <p className="font-medium text-white">LLM visibility</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Average visibility score:{" "}
                    <span className="font-mono text-white">
                      {Math.round(
                        DEMO_LLM_PLATFORM_SCORES.reduce((a, p) => a + p.score, 0) /
                          DEMO_LLM_PLATFORM_SCORES.length,
                      )}
                      /100
                    </span>{" "}
                    (up from ~67 in the demo story).
                  </li>
                  <li>
                    Strongest assistant:{" "}
                    <span className="text-white">
                      {DEMO_LLM_PLATFORM_SCORES.reduce((best, p) => (p.score > best.score ? p : best)).platform}
                    </span>
                    .
                  </li>
                  <li>
                    Lowest score:{" "}
                    <span className="text-white">
                      {DEMO_LLM_PLATFORM_SCORES.reduce((low, p) => (p.score < low.score ? p : low)).platform}
                    </span>
                    .
                  </li>
                  <li>Total mentions across assistants (demo): ~1,247.</li>
                </ul>
              </section>
              <section>
                <p className="font-medium text-white">Google Search</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Average position: {DEMO_GOOGLE_SUMMARY.avgPosition} (improved ~2.1 vs prior demo period).</li>
                  <li>Total clicks: {DEMO_GOOGLE_SUMMARY.clicks.toLocaleString()} (~+18%).</li>
                  <li>Impressions: {(DEMO_GOOGLE_SUMMARY.impressions / 1000).toFixed(0)}K (~+12%).</li>
                  <li>CTR: {(DEMO_GOOGLE_SUMMARY.ctr * 100).toFixed(1)}% (~+0.5 pts).</li>
                </ul>
              </section>
              <section>
                <p className="font-medium text-white">Website</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>{DEMO_WEBSITE_AUDIT_SUMMARY.indexed} pages indexed.</li>
                  <li>{DEMO_WEBSITE_AUDIT_SUMMARY.notIndexed} pages not indexed yet.</li>
                  <li>{DEMO_WEBSITE_AUDIT_SUMMARY.discoveredOnly} URLs only discovered (need links or fixes).</li>
                </ul>
              </section>
            </CardContent>
          </Card>

          <Card className="border-[#262626] bg-[#111] p-6">
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
                  <Line
                    type="monotone"
                    dataKey="salesforce"
                    name="Salesforce"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostic" className="space-y-6">
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Why did these results happen?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-neutral-300">
              <section>
                <p className="font-medium text-white">Why LLM visibility moved up (story)</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>You shipped comparison pages that match how people ask questions in chat.</li>
                  <li>More reputable sites started referencing your domain.</li>
                  <li>FAQ-style blocks were added to key URLs.</li>
                </ul>
              </section>
              <section>
                <p className="font-medium text-white">Why Perplexity can lag</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>It leans on third-party reviews (G2, Capterra) and news.</li>
                  <li>Thin review presence vs large incumbents reduces citations.</li>
                </ul>
              </section>
              <section>
                <p className="font-medium text-white">Why some Google terms stall on page 2</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Top results are longer, better linked, and often include FAQ schema.</li>
                  <li>Your pages may need clearer intent match and internal links.</li>
                </ul>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">What might happen next?</CardTitle>
              <p className="text-sm text-neutral-500">Educational forecast, not a guarantee.</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-neutral-300">
              <p>
                If you keep publishing helpful pages and fixing technical issues, LLM visibility in this demo model
                trends toward the high 80s within about 90 days.
              </p>
              <div className="h-[260px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={DEMO_LLM_FORECAST_SERIES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
                    <YAxis domain={[60, 100]} tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" name="LLM score" stroke="#a78bfa" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Keyword rank outlook (demo)</CardTitle>
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
                  {DEMO_KEYWORD_RANK_FORECAST.map((k) => (
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

          <Card className="border-[#262626] bg-[#111]">
            <CardHeader>
              <CardTitle className="text-base text-white">Risk notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-300">
              <p>• Large competitors may publish more AI-focused guides—keep your differentiation sharp.</p>
              <p>• If you pause content, page-two keywords may flatten instead of climbing.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
