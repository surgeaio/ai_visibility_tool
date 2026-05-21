"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelectedBrand } from "@/lib/context/brand-context";

interface SourceRow {
  domain: string;
  mentions: number;
  urls: string[];
  lastSeen: string | null;
}

export default function SourcesPage() {
  const { selectedBrandId } = useSelectedBrand();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setStatus("loading");
    setError(null);
    try {
      const params = new URLSearchParams({ brandId: selectedBrandId, range: "30" });
      const res = await fetch(`/api/sources?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { sources: SourceRow[]; total: number };
      setSources(json.sources);
      setTotal(json.total);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to load sources");
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Citation sources</h2>
          <p className="text-sm text-neutral-500">
            Domains AI models cite when answering category prompts for your brand ({total} domains,
            last 30 days).
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          disabled={status === "loading"}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {!selectedBrandId ? (
        <div className="rounded-lg border border-[#262626] bg-[#111] px-4 py-6 text-center text-sm text-neutral-500">
          Select a brand to view citation sources.
        </div>
      ) : status === "loading" && sources.length === 0 ? (
        <div className="rounded-lg border border-[#262626] bg-[#111] px-4 py-6 text-center text-sm text-neutral-500">
          Loading…
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-[#262626] bg-[#111] px-4 py-6 text-center text-sm text-neutral-500">
          No citation sources found for this brand in the last 30 days.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#111]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
              <tr>
                <th className="p-4">Domain</th>
                <th className="p-4">Mentions</th>
                <th className="p-4">Last seen</th>
                <th className="p-4">Sample URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {sources.map((s) => (
                <tr key={s.domain} className="hover:bg-[#1a1a1a]/50">
                  <td className="p-4 font-mono text-neutral-200">{s.domain}</td>
                  <td className="p-4 font-mono text-neutral-300">{s.mentions}</td>
                  <td className="p-4 font-mono text-xs text-neutral-500">
                    {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString() : "—"}
                  </td>
                  <td className="max-w-xs truncate p-4">
                    {s.urls[0] ? (
                      <a
                        href={s.urls[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-sky-300/90 hover:underline"
                      >
                        {s.urls[0]}
                      </a>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base text-white">Source gap analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[#262626] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">Review platforms</p>
              <p className="text-xs text-neutral-500">
                AI models cite G2, Capterra, and TrustRadius heavily. Drive more verified reviews to
                increase citation frequency.
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/recommendations">Open recommendations</Link>
            </Button>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[#262626] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-white">Comparison content</p>
              <p className="text-xs text-neutral-500">
                Publish &quot;vs competitor&quot; landing pages — AI models cite comparison content
                2–3× more than product pages.
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/recommendations">Open recommendations</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
