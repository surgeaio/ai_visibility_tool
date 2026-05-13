"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelectedBrand } from "@/lib/context/brand-context";

type Row = { url: string; isIndexed: boolean; coverageState: string | null; indexingIssue: string | null };

export default function NonIndexedPagesPage() {
  const { selectedBrandId } = useSelectedBrand();
  const [rows, setRows] = useState<Row[]>([]);
  const [source, setSource] = useState<"demo" | "live" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ brandId: selectedBrandId, indexed: "false" });
      const res = await fetch(`/api/indexed-pages?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as { source: "demo" | "live"; pages: Row[] };
      setSource(json.source);
      setRows(json.pages ?? []);
    } catch {
      setRows([]);
      setSource("live");
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const count = rows.length;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard/website-audit" className="text-sm text-neutral-400 hover:text-white">
          ← Back to website audit
        </Link>
        <h2 className="mt-3 text-lg font-semibold text-white">Non-indexed pages ({count})</h2>
        <p className="mt-1 text-sm text-neutral-500">
          URLs that Search Console reports as not in the main index, plus crawl hints when available.
        </p>
        {source ? (
          <p className="mt-2 text-xs text-neutral-600">{source === "demo" ? "Demo list" : "Live list"}</p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base text-white">URL list</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" type="button" disabled title="Coming soon">
                Request indexing
              </Button>
              <Button size="sm" variant="secondary" type="button" disabled title="Coming soon">
                Export list
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!rows.length ? (
              <p className="text-sm text-neutral-500">No non-indexed URLs in this view. Great news.</p>
            ) : (
              rows.map((p) => (
                <div key={p.url} className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                  <p className="font-mono text-sm text-white">{p.url}</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    <span className="text-neutral-500">State:</span> {p.coverageState ?? "Unknown"}
                  </p>
                  {p.indexingIssue ? (
                    <p className="mt-2 text-sm text-amber-200/90">
                      <span className="font-medium text-amber-400">Hint: </span>
                      {p.indexingIssue}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
