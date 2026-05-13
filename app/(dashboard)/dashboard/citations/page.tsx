"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelectedBrand } from "@/lib/context/brand-context";

type CitationRow = {
  id: string;
  brandId: string;
  domain: string;
  url: string;
  model: string;
  createdAt: string;
};

export default function CitationsDashboardPage() {
  const { selectedBrandId } = useSelectedBrand();
  const [items, setItems] = useState<CitationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setStatus("loading");
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "50", offset: "0", brandId: selectedBrandId });
      const res = await fetch(`/api/citations?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const json = (await res.json()) as { citations: CitationRow[]; total: number };
      setItems(json.citations);
      setTotal(json.total);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to load citations");
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Citations</h1>
          <p className="mt-1 text-sm text-neutral-400">
            URLs surfaced in AI answers for your brand ({total} loaded). Data comes from{" "}
            <code className="text-xs text-neutral-300">GET /api/citations</code>.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={status === "loading"}>
          <RefreshCw className={`mr-2 h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Card className="border-[#262626] bg-[#141414]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base text-white">Top cited domains</CardTitle>
            <CardDescription>Demo + repository-backed list</CardDescription>
          </div>
          <BookOpen className="h-4 w-4 text-sky-400" aria-hidden />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-[#262626]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
                <tr>
                  <th className="p-3 font-medium">Domain</th>
                  <th className="p-3 font-medium">URL</th>
                  <th className="p-3 font-medium">Model</th>
                  <th className="p-3 font-medium">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-[#1a1a1a]/50">
                    <td className="p-3 text-neutral-200">{c.domain}</td>
                    <td className="max-w-xs truncate p-3 text-sky-300/90">
                      <a href={c.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {c.url}
                      </a>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">{c.model}</Badge>
                    </td>
                    <td className="p-3 font-mono text-xs text-neutral-500">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
