"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_CITED_PAGES, DEMO_SOURCE_GAPS, DEMO_SOURCES } from "@/lib/demo/seed-data";

export default function SourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">Citation sources</h2>
        <p className="text-sm text-neutral-500">Domains and URLs models cite when answering category prompts.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#111]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
            <tr>
              <th className="p-4">Domain</th>
              <th className="p-4">Citations</th>
              <th className="p-4">Authority score</th>
              <th className="p-4">Your content?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {DEMO_SOURCES.map((s) => (
              <tr key={s.domain}>
                <td className="p-4 font-mono text-neutral-200">{s.domain}</td>
                <td className="p-4 font-mono">{s.citations}</td>
                <td className="p-4 font-mono">{s.authority}</td>
                <td className="p-4">{s.yours ? <span className="text-emerald-400">Yes</span> : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Top cited pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            {DEMO_CITED_PAGES.map((p) => (
              <div key={p.url} className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                <p className="font-mono text-xs text-neutral-400">{p.url}</p>
                <p className="mt-1 text-sm text-neutral-300">Competitor: {p.competitor}</p>
                <p className="mt-2 text-xs text-amber-200/90">{p.gap}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Source gap analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            {DEMO_SOURCE_GAPS.map((g) => (
              <div key={g.topic} className="flex flex-col gap-2 rounded-lg border border-dashed border-[#262626] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{g.topic}</p>
                  <p className="text-xs text-neutral-500">{g.action}</p>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/dashboard/recommendations">Open recommendations</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
