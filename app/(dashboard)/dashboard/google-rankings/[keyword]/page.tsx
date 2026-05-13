"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDemoKeywordDiagnostic } from "@/lib/demo/seed-data";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard";

export default function GoogleKeywordDetailPage({ params }: { params: { keyword: string } }) {
  const brandName = useDashboardStore((s) => s.brandName);
  const keyword = decodeURIComponent(params.keyword);
  const d = getDemoKeywordDiagnostic(keyword);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/google-rankings" className="text-sm text-neutral-400 hover:text-white">
          ← Back to Google rankings
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-white">
          &ldquo;{keyword}&rdquo; — rank #{d.position}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">Diagnostic view (demo). Connect Search Console for live data.</p>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Your performance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm text-neutral-300">
          <span>
            Position: <span className="font-mono text-white">#{d.position}</span>
          </span>
          <span>
            Results page: <span className="font-mono text-white">{d.page}</span>
          </span>
          <span>
            Clicks: <span className="font-mono text-white">{d.clicks}</span>
          </span>
          <span>
            CTR: <span className="font-mono text-white">{(d.ctr * 100).toFixed(1)}%</span>
          </span>
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Who ranks above you?</CardTitle>
          <p className="text-sm text-neutral-500">Illustrative SERP snapshot for learning, not a live SERP API.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Site</th>
                <th className="p-3">Why</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {d.serp.map((r) => (
                <tr
                  key={`${r.rank}-${r.site}`}
                  className={cn(r.site.includes("(you)") && "bg-white/[0.04]")}
                >
                  <td className="p-3 font-mono">{r.rank}</td>
                  <td className="p-3 font-medium text-white">{r.site}</td>
                  <td className="p-3 text-neutral-400">{r.why}</td>
                  <td className="p-3 text-neutral-400">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Why aren&apos;t you ranking higher?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {d.diagnostics.map((x) => (
            <p
              key={x.text}
              className={cn(
                "rounded-lg border px-3 py-2",
                x.ok ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200/90" : "border-red-500/20 bg-red-500/5 text-red-100/90",
              )}
            >
              {x.ok ? "✅ " : "❌ "}
              {x.text}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Action plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-300">
            {d.actionPlan.map((a) => (
              <li key={a.step}>
                <span className="text-white">{a.step}</span>{" "}
                <span className="text-neutral-500">(Priority: {a.priority})</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Predicted outcome</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-300">
          <p>{d.prediction}</p>
          <p className="mt-3 text-xs text-neutral-500">
            Brand context: <span className="text-neutral-400">{brandName}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
