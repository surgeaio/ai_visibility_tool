import Link from "next/link";
import { RankPositionChart } from "@/components/charts/RankPositionChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_BRAND,
  DEMO_GOOGLE_KEYWORDS,
  DEMO_GOOGLE_PAGE2_KEYWORDS,
  DEMO_GOOGLE_RANK_TREND,
  DEMO_GOOGLE_SUMMARY,
} from "@/lib/demo/seed-data";

export default function GoogleRankingsPage() {
  const s = DEMO_GOOGLE_SUMMARY;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Google rankings</h2>
          <p className="text-sm text-neutral-500">Search performance from your connected site (demo numbers).</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            Site: {DEMO_BRAND.name.toLowerCase()}.com
          </Badge>
          <Badge variant="outline" className="text-xs">
            Demo
          </Badge>
        </div>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Summary (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Avg position" value={String(s.avgPosition)} hint="Lower is better" delta="Improved ~2.1" />
            <Metric label="Clicks" value={s.clicks.toLocaleString()} delta="Up ~18% (demo)" />
            <Metric label="Impressions" value={`${(s.impressions / 1000).toFixed(0)}K`} delta="Up ~12% (demo)" />
            <Metric label="CTR" value={`${(s.ctr * 100).toFixed(1)}%`} delta="Up ~0.5 pts (demo)" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111] p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base text-white">Rank trend</CardTitle>
          <p className="text-sm text-neutral-500">Average position over time (demo).</p>
        </CardHeader>
        <RankPositionChart data={DEMO_GOOGLE_RANK_TREND} />
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
              {DEMO_GOOGLE_KEYWORDS.map((k) => (
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
          <p className="text-sm text-neutral-500">Ranks 11–30 are often quick wins with better content and links.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Keyword</th>
                <th className="p-3">Position</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {DEMO_GOOGLE_PAGE2_KEYWORDS.map((k) => (
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
                  <td className="p-3 text-neutral-400">{k.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
