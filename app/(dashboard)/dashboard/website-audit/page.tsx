"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SentimentDonut } from "@/components/charts/SentimentDonut";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_WEBSITE_AUDIT_SUMMARY,
  DEMO_WEBSITE_CRITICAL_ISSUES,
  DEMO_WEBSITE_WARNINGS,
  DEMO_BRAND_ID,
} from "@/lib/demo/seed-data";
import { toast } from "sonner";

type AuditSummary = {
  overallScore: number;
  critical: number;
  warnings: number;
  totalPages: number;
  indexed: number | null;
  notIndexed: number | null;
  discoveredOnly?: number | null;
  crawlProgress?: number | null;
  completedAt?: string | null;
};

export default function WebsiteAuditPage() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"demo" | "live" | null>(null);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [empty, setEmpty] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ brandId: DEMO_BRAND_ID, range: "30d" });
      const res = await fetch(`/api/website-audit/latest?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as {
        source: "demo" | "live";
        summary: AuditSummary | null;
        empty?: boolean;
      };
      setSource(json.source);
      setEmpty(!!json.empty);
      if (json.source === "demo") {
        setSummary({ ...DEMO_WEBSITE_AUDIT_SUMMARY });
      } else if (json.summary) {
        setSummary({
          overallScore: json.summary.overallScore ?? 0,
          critical: json.summary.critical ?? 0,
          warnings: json.summary.warnings ?? 0,
          totalPages: json.summary.totalPages ?? 0,
          indexed: json.summary.indexed,
          notIndexed: json.summary.notIndexed,
          discoveredOnly: json.summary.discoveredOnly ?? null,
          crawlProgress: json.summary.crawlProgress ?? null,
          completedAt: json.summary.completedAt ?? null,
        });
      } else {
        setSummary(null);
      }
    } catch {
      toast.error("Could not load audit summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAudit() {
    setRunning(true);
    try {
      const res = await fetch("/api/website-audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: DEMO_BRAND_ID, maxPages: 25 }),
      });
      const json = (await res.json()) as { jobId?: string; status?: string; note?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to start crawl");
      if (json.status === "queued") {
        toast.success("Crawl queued. Results appear after the worker finishes.");
      } else {
        toast.message(json.note ?? "Start Redis workers to process crawls.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start audit");
    } finally {
      setRunning(false);
    }
  }

  const a = summary;
  const totalPages = a?.totalPages ?? 1;
  const indexed = a?.indexed ?? 0;
  const notIndexed = a?.notIndexed ?? 0;
  const indexedPct = a?.indexed != null ? Math.round((indexed / totalPages) * 100) : null;
  const notPct = a?.notIndexed != null ? Math.round((notIndexed / totalPages) * 100) : null;
  const donut =
    indexedPct != null && notPct != null
      ? [
          { name: "Indexed", value: indexedPct, color: "#22c55e" },
          { name: "Not indexed", value: notPct, color: "#ef4444" },
          { name: "Other", value: Math.max(0, 100 - indexedPct - notPct), color: "#eab308" },
        ]
      : [{ name: "Pages audited", value: 100, color: "#38bdf8" }];

  const completedLabel =
    a?.completedAt && source === "live"
      ? new Date(a.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : source === "demo"
        ? "Demo snapshot"
        : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Website audit</h2>
          <p className="text-sm text-neutral-500">Technical health from your last crawl (or demo sample).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {source ? (
            <Badge variant="outline" className="text-xs">
              {source === "demo" ? "Demo" : "Live"}
            </Badge>
          ) : null}
          {completedLabel ? (
            <Badge variant="secondary" className="text-xs">
              Last audit: {completedLabel}
            </Badge>
          ) : null}
          <Button size="sm" variant="secondary" type="button" disabled={running || source === "demo"} onClick={() => void runAudit()}>
            {running ? "Starting…" : "Run new audit"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : empty && source === "live" ? (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">No crawl results yet</CardTitle>
            <p className="text-sm text-neutral-500">Run an audit to crawl your site and store issues.</p>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="secondary" disabled={running} onClick={() => void runAudit()}>
              Run first audit
            </Button>
          </CardContent>
        </Card>
      ) : a ? (
        <>
          <Card className="border-[#262626] bg-[#111]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Overall score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-4xl font-semibold text-white">{a.overallScore}/100</p>
              <p className="mt-1 text-sm text-neutral-500">
                {source === "demo" ? "Demo uplift story." : "Based on the latest stored crawl."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Critical issues" value={String(a.critical)} />
            <MiniStat label="Warnings" value={String(a.warnings)} />
            <MiniStat label="Pages crawled" value={String(a.totalPages)} />
            <MiniStat
              label="Indexed"
              value={a.indexed != null ? `${a.indexed}/${a.totalPages}` : "—"}
              sub={indexedPct != null ? `(${indexedPct}%)` : undefined}
            />
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <Card className="min-w-0 border-[#262626] bg-[#111] p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base text-white">
                  {indexedPct != null ? "Indexing mix" : "Crawl coverage"}
                </CardTitle>
                <p className="text-sm text-neutral-500">
                  {indexedPct != null
                    ? "Share of URLs by indexing state (approximate %)."
                    : "Crawl-only view — connect Search Console for indexing mix."}
                </p>
              </CardHeader>
              <SentimentDonut data={donut} />
            </Card>

            <Card className="border-[#262626] bg-[#111] p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base text-white">Non-indexed pages</CardTitle>
                <p className="text-sm text-neutral-500">URLs that need attention in Search Console.</p>
              </CardHeader>
              <CardContent className="px-0">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/dashboard/website-audit/non-indexed">
                    View non-indexed URLs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {source === "demo" ? (
            <>
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
            </>
          ) : (
            <Card className="border-[#262626] bg-[#111]">
              <CardContent className="p-6 text-sm text-neutral-400">
                Open individual page audits in the database explorer for full issue rows, or re-run a crawl after
                content fixes.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
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
