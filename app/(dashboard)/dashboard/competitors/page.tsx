"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { SentimentBadge } from "@/components/dashboard/SentimentBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";
import { cn } from "@/lib/utils";

type CompetitorItem = {
  id: string;
  name: string;
  domain: string | null;
  visibility: number | null;
  sentiment: number | null;
  position: number | null;
  trend: "up" | "down" | "neutral";
};

export default function CompetitorsPage() {
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);

  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCompetitors = useCallback(async (brandId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitors?brandId=${encodeURIComponent(brandId)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        competitors?: CompetitorItem[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load competitors");
      }
      setCompetitors(json.competitors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load competitors");
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBrandId) {
      setCompetitors([]);
      return;
    }
    void fetchCompetitors(selectedBrandId);
  }, [selectedBrandId, fetchCompetitors]);

  async function handleAddCompetitor() {
    if (!selectedBrandId || !newName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: selectedBrandId,
          name: newName.trim(),
          domain: newDomain.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to add competitor");
      setNewName("");
      setNewDomain("");
      setOpenAdd(false);
      await fetchCompetitors(selectedBrandId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add competitor");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(competitorId: string) {
    if (!selectedBrandId) return;
    try {
      const params = new URLSearchParams({ id: competitorId, brandId: selectedBrandId });
      const res = await fetch(`/api/competitors?${params.toString()}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      await fetchCompetitors(selectedBrandId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete competitor");
    }
  }

  if (!selectedBrandId) {
    return (
      <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-20 text-center">
        <p className="text-neutral-400">Select a client from the sidebar to view competitors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Competitors</h2>
          <p className="text-sm text-neutral-500">
            Benchmark visibility and sentiment for {brandName || "this client"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={loading}
            onClick={() => void fetchCompetitors(selectedBrandId)}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add competitor for {brandName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="cn">Brand name</Label>
                  <Input
                    id="cn"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. ThoroughCare"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cd">Domain (optional)</Label>
                  <Input
                    id="cd"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="e.g. thoroughcare.net"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpenAdd(false)}>
                  Cancel
                </Button>
                <Button disabled={saving || !newName.trim()} onClick={() => void handleAddCompetitor()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="py-16 text-center text-neutral-500">Loading competitors…</div>
      ) : competitors.length === 0 ? (
        <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-20 text-center">
          <h3 className="text-lg font-medium text-white">No competitors yet</h3>
          <p className="mt-2 text-sm text-neutral-500">
            Add competitors for {brandName} to benchmark AI visibility.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setOpenAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Competitor
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {competitors.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-semibold">
                      {c.name.slice(0, 2)}
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon t={c.trend} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-500 hover:text-red-400"
                        onClick={() => void handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  {c.domain ? (
                    <p className="text-xs text-neutral-500">{c.domain}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-400">
                    <span>Visibility</span>
                    <span className="font-mono text-white">
                      {c.visibility != null ? `${c.visibility}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Sentiment</span>
                    {c.sentiment != null ? (
                      <SentimentBadge score={c.sentiment} size="sm" />
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Avg position</span>
                    <span className="font-mono text-white">
                      {c.position != null ? c.position : "—"}
                    </span>
                  </div>
                  <Button variant="secondary" className="mt-2 w-full" size="sm" asChild>
                    <Link
                      href={`/dashboard/competitors/${encodeURIComponent(c.id)}?brandId=${encodeURIComponent(selectedBrandId)}`}
                    >
                      View detail
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#111]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
                <tr>
                  <th className="p-4">Brand</th>
                  <th className="p-4">Domain</th>
                  <th className="p-4">Visibility</th>
                  <th className="p-4">Sentiment</th>
                  <th className="p-4">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {competitors.map((c) => (
                  <tr key={c.id}>
                    <td className="p-4 font-medium text-white">{c.name}</td>
                    <td className="p-4 text-neutral-400">{c.domain ?? "—"}</td>
                    <td className="p-4 font-mono">
                      {c.visibility != null ? `${c.visibility}%` : "—"}
                    </td>
                    <td className="p-4">
                      {c.sentiment != null ? (
                        <SentimentBadge score={c.sentiment} size="sm" />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 font-mono">{c.position != null ? c.position : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TrendIcon({ t }: { t: "up" | "down" | "neutral" }) {
  if (t === "up") return <ArrowUpRight className="h-4 w-4 text-emerald-400" />;
  if (t === "down") return <ArrowDownRight className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-neutral-500" />;
}
