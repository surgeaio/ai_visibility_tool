import Link from "next/link";
import { SentimentDonut } from "@/components/charts/SentimentDonut";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_WEBSITE_AUDIT_SUMMARY,
  DEMO_WEBSITE_CRITICAL_ISSUES,
  DEMO_WEBSITE_WARNINGS,
} from "@/lib/demo/seed-data";

export default function WebsiteAuditPage() {
  const a = DEMO_WEBSITE_AUDIT_SUMMARY;
  const indexedPct = Math.round((a.indexed / a.totalPages) * 100);
  const notPct = Math.round((a.notIndexed / a.totalPages) * 100);
  const discPct = Math.max(0, 100 - indexedPct - notPct);

  const donut = [
    { name: "Indexed", value: indexedPct, color: "#22c55e" },
    { name: "Not indexed", value: notPct, color: "#ef4444" },
    { name: "Discovered only", value: discPct, color: "#eab308" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Website audit</h2>
          <p className="text-sm text-neutral-500">Technical and indexing health for your main site (demo).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            Last audit: 2 days ago (demo)
          </Badge>
          <Button size="sm" variant="secondary" type="button" disabled title="Coming soon">
            Run new audit
          </Button>
        </div>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Overall score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-4xl font-semibold text-white">{a.overallScore}/100</p>
          <p className="mt-1 text-sm text-emerald-400">Up ~5 vs the prior demo audit.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Critical issues" value={String(a.critical)} />
        <MiniStat label="Warnings" value={String(a.warnings)} />
        <MiniStat label="Pages crawled" value={String(a.totalPages)} />
        <MiniStat label="Indexed" value={`${a.indexed}/${a.totalPages}`} sub={`(${indexedPct}%)`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Indexing mix</CardTitle>
            <p className="text-sm text-neutral-500">Share of URLs by indexing state (approximate %).</p>
          </CardHeader>
          <SentimentDonut data={donut} />
        </Card>

        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Non-indexed pages</CardTitle>
            <p className="text-sm text-neutral-500">See each URL and a plain-English reason.</p>
          </CardHeader>
          <CardContent className="px-0">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/website-audit/non-indexed">View {a.notIndexed} non-indexed URLs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Critical issues</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Issue</th>
                <th className="p-3">Pages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {DEMO_WEBSITE_CRITICAL_ISSUES.map((row) => (
                <tr key={row.issue}>
                  <td className="p-3 text-neutral-200">{row.issue}</td>
                  <td className="p-3 font-mono text-neutral-400">{row.pages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Warnings</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">Issue</th>
                <th className="p-3">Pages / items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {DEMO_WEBSITE_WARNINGS.map((row) => (
                <tr key={row.issue}>
                  <td className="p-3 text-neutral-200">{row.issue}</td>
                  <td className="p-3 font-mono text-neutral-400">{row.pages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4">
      <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-2xl text-white">{value}</p>
      {sub ? <p className="text-xs text-neutral-500">{sub}</p> : null}
    </div>
  );
}
