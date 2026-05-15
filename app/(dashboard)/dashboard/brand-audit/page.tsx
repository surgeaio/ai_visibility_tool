"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BrandAuditReport, LlmVisibilityQueryResult } from "@/lib/brand-audit/types";
import { toast } from "sonner";

const BRANDS = [
  {
    key: "shifthub",
    name: "Shifthub",
    url: "https://shifthub.io",
    industry: "Contact Centre WFM",
    favicon: "https://www.google.com/s2/favicons?domain=shifthub.io&sz=64",
  },
  {
    key: "circle",
    name: "Circle Healthcare",
    url: "https://circle.healthcare",
    industry: "AI Healthcare / Care Management",
    favicon: "https://www.google.com/s2/favicons?domain=circle.healthcare&sz=64",
  },
] as const;

type BrandKey = (typeof BRANDS)[number]["key"];

function scoreColor(score: number): string {
  if (score >= 61) return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  if (score >= 31) return "bg-amber-500/15 text-amber-800 border-amber-500/30";
  return "bg-red-500/15 text-red-700 border-red-500/30";
}

function providerLabel(p: string): string {
  const map: Record<string, string> = {
    openai: "ChatGPT",
    anthropic: "Claude",
    gemini: "Gemini",
    perplexity: "Perplexity",
  };
  return map[p] ?? p;
}

function buildLlmMatrix(results: LlmVisibilityQueryResult[]) {
  const providers = ["openai", "anthropic", "gemini", "perplexity"] as const;
  const categories = ["direct", "category", "competitor"] as const;
  const matrix: Record<string, Record<string, { mentioned: boolean; position: number | null }>> = {};
  for (const cat of categories) {
    matrix[cat] = {};
    for (const prov of providers) {
      const hit = results.find((r) => r.queryCategory === cat && r.llmProvider === prov);
      matrix[cat][prov] = {
        mentioned: hit?.brandMentioned ?? false,
        position: hit?.mentionPosition ?? null,
      };
    }
  }
  const providerScores = providers.map((prov) => {
    const subset = results.filter((r) => r.llmProvider === prov);
    if (subset.length === 0) return { prov, pct: 0 };
    const mentioned = subset.filter((r) => r.brandMentioned).length;
    return { prov, pct: Math.round((mentioned / subset.length) * 100) };
  });
  return { matrix, providerScores, providers, categories };
}

function positionLabel(pos: number | null): string {
  if (!pos) return "✓";
  if (pos === 1) return "1st";
  if (pos === 2) return "2nd";
  if (pos === 3) return "3rd";
  return `${pos}th`;
}

function AuditSection({ report }: { report: BrandAuditReport }) {
  const audit = report.websiteAudit;
  if (!audit) {
    return <p className="text-sm text-muted-foreground">No website audit data yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "SEO Health", value: report.scores.seoScore },
          { label: "Technical", value: report.scores.technicalScore },
          { label: "Content", value: report.scores.contentScore },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl">{s.value}/100</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">On-page SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            Title: {audit.basic.title ? "✅" : "❌"} {audit.basic.title.slice(0, 60)}
          </div>
          <div>Meta description: {audit.basic.metaDescription ? "✅ Present" : "❌ Missing"}</div>
          <div>
            H1 count: {audit.seo.h1Count === 1 ? "✅" : "⚠️"} {audit.seo.h1Count}
          </div>
          <div>
            Schema: {audit.seo.hasSchemaMarkup ? "✅" : "❌"}{" "}
            {audit.seo.schemaTypes.join(", ") || "none"}
          </div>
          <div>Sitemap: {audit.seo.hasSitemap ? "✅" : "❌"}</div>
          <div>SSL: {audit.technical.isHttps ? "✅ HTTPS" : "❌ HTTP"}</div>
          <div>Mobile viewport: {audit.technical.hasViewportMeta ? "✅" : "❌"}</div>
          <div>Response: {(audit.technical.responseTimeMs / 1000).toFixed(2)}s</div>
        </CardContent>
      </Card>
      {audit.technical.technologies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Technologies detected</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {audit.technical.technologies.map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {audit.technical.gtmId ? (
              <Badge variant="outline">{audit.technical.gtmId}</Badge>
            ) : null}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top headings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {audit.content.headings.slice(0, 8).map((h, i) => (
            <p key={i}>
              <span className="font-medium uppercase text-muted-foreground">{h.level}:</span> {h.text}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function LlmMatrix({ results }: { results: LlmVisibilityQueryResult[] }) {
  const { matrix, providerScores, providers, categories } = useMemo(
    () => buildLlmMatrix(results),
    [results],
  );
  return (
    <div className="space-y-4 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Category</th>
            {providers.map((p) => (
              <th key={p} className="p-2 text-center">
                {providerLabel(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat} className="border-b">
              <td className="p-2 font-medium capitalize">{cat}</td>
              {providers.map((p) => {
                const cell = matrix[cat][p];
                return (
                  <td key={p} className="p-2 text-center">
                    {cell.mentioned ? (
                      <span className="text-emerald-600">✅ {positionLabel(cell.position)}</span>
                    ) : (
                      <span className="text-muted-foreground">❌</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className="p-2 font-medium">Score</td>
            {providerScores.map(({ prov, pct }) => (
              <td key={prov} className="p-2 text-center font-semibold">
                {pct}%
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function BrandAuditPage() {
  const [activeBrand, setActiveBrand] = useState<BrandKey>("shifthub");
  const [reports, setReports] = useState<Record<BrandKey, BrandAuditReport | null>>({
    shifthub: null,
    circle: null,
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<BrandKey | null>(null);

  const loadReport = useCallback(async (key: BrandKey) => {
    const res = await fetch(`/api/brand-audit/full-report?brand=${key}`, { cache: "no-store" });
    const json = (await res.json()) as { report: BrandAuditReport };
    setReports((prev) => ({ ...prev, [key]: json.report }));
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all(BRANDS.map((b) => loadReport(b.key)));
      setLoading(false);
    })();
  }, [loadReport]);

  const report = reports[activeBrand];

  async function runFullAudit(key: BrandKey) {
    const meta = BRANDS.find((b) => b.key === key)!;
    setRunning(key);
    try {
      const res = await fetch("/api/brand-audit/full-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: key,
          url: meta.url,
          runLlm: true,
          maxLlmQueries: 4,
        }),
      });
      const json = (await res.json()) as BrandAuditReport & { error?: string; saved?: boolean };
      if (!res.ok) throw new Error(json.error ?? "Audit failed");
      setReports((prev) => ({ ...prev, [key]: json }));
      toast.success(
        json.saved ? `${meta.name} audit complete & saved` : `${meta.name} audit complete (not saved to DB)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setRunning(null);
    }
  }

  const competitorCounts = useMemo(() => {
    if (!report) return [];
    const counts = new Map<string, number>();
    for (const r of report.llmResults) {
      for (const c of r.competitorsMentioned) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [report]);

  return (
    <div className="space-y-8 p-1">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Brand Audit
          </h1>
          <p className="text-sm text-muted-foreground">
            Website scrape + LLM visibility for Shifthub and Circle Healthcare
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {BRANDS.map((b) => {
          const r = reports[b.key];
          const score = r?.scores.overallHealthScore ?? 0;
          return (
            <Card
              key={b.key}
              className={`cursor-pointer transition-shadow hover:shadow-md ${activeBrand === b.key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setActiveBrand(b.key)}
            >
              <CardHeader className="flex flex-row items-start gap-4">
                <img src={b.favicon} alt="" className="h-10 w-10 rounded-md border" />
                <div className="flex-1 space-y-1">
                  <CardTitle className="text-lg">{b.name}</CardTitle>
                  <CardDescription>{b.industry}</CardDescription>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {b.url.replace("https://", "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Badge className={scoreColor(score)}>{score}/100</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {r?.isSampleData
                    ? "Sample data — run audit to refresh"
                    : `Updated ${new Date(r?.generatedAt ?? 0).toLocaleString()}`}
                </span>
                <Button
                  size="sm"
                  disabled={running !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    void runFullAudit(b.key);
                  }}
                >
                  {running === b.key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Run Full Audit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading || !report ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading audit…
        </div>
      ) : (
        <>
          {report.isSampleData && (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-900">
              Sample data — Run Full Audit to refresh with live scrape + LLM results
            </Badge>
          )}

          <Card>
            <CardHeader>
              <CardDescription>Overall health — {BRANDS.find((b) => b.key === activeBrand)?.name}</CardDescription>
              <CardTitle className="text-5xl">{report.scores.overallHealthScore}</CardTitle>
              <CardDescription>
                LLM {report.scores.llmVisibilityScore}% · SEO {report.scores.seoScore}% · Technical{" "}
                {report.scores.technicalScore}%
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs defaultValue="website">
            <TabsList>
              <TabsTrigger value="website">Website audit</TabsTrigger>
              <TabsTrigger value="llm">LLM visibility</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="recs">Recommendations</TabsTrigger>
            </TabsList>
            <TabsContent value="website" className="mt-4">
              <AuditSection report={report} />
            </TabsContent>
            <TabsContent value="llm" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visibility matrix</CardTitle>
                  <CardDescription>
                    Overall LLM visibility score:{" "}
                    <span className="font-semibold">{report.scores.llmVisibilityScore}/100</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.llmResults.length > 0 ? (
                    <LlmMatrix results={report.llmResults} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No LLM results yet. Add API keys and run a full audit.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="competitors" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Competitor mentions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {competitorCounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No competitors detected in LLM responses.</p>
                  ) : (
                    competitorCounts.map(([name, count]) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, count * 25)}%` }}
                          />
                        </div>
                        <span className="w-40 text-sm font-medium">{name}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="recs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-5 text-sm">
                    {report.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
