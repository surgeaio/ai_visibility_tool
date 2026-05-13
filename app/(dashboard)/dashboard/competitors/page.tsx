"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";
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
import { DEMO_COMPETITORS } from "@/lib/demo/seed-data";
import { cn } from "@/lib/utils";

const YOUR_ROW = {
  name: "Attio",
  visibility: 63,
  sentiment: 89,
  position: 2.4,
  mentions: 184,
  trust: 78,
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState(DEMO_COMPETITORS);
  const [openAdd, setOpenAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const rows = [YOUR_ROW, ...competitors.map((c) => ({
    name: c.name,
    visibility: c.visibility,
    sentiment: c.sentiment,
    position: c.position,
    mentions: Math.round(c.visibility * 2.1),
    trust: Math.min(99, c.sentiment + 8),
  }))];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Competitors</h2>
          <p className="text-sm text-neutral-500">Benchmark visibility and sentiment across named rivals.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Competitor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add competitor</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="cn">Brand name</Label>
              <Input id="cn" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Close" />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenAdd(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newName.trim()) return;
                  setCompetitors((c) => [
                    ...c,
                    {
                      id: crypto.randomUUID(),
                      name: newName.trim(),
                      visibility: 45,
                      sentiment: 60,
                      position: 3,
                      trend: "neutral" as const,
                    },
                  ]);
                  setNewName("");
                  setOpenAdd(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {competitors.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-semibold">
                  {c.name.slice(0, 2)}
                </div>
                <TrendIcon t={c.trend} />
              </div>
              <CardTitle className="text-base">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Visibility</span>
                <span className="font-mono text-white">{c.visibility}%</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Sentiment</span>
                <SentimentBadge score={c.sentiment} size="sm" />
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Avg position</span>
                <span className="font-mono text-white">{c.position}</span>
              </div>
              <Button variant="secondary" className="mt-2 w-full" size="sm" asChild>
                <Link href={`/dashboard/competitors/${encodeURIComponent(c.id)}`}>View detail</Link>
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
              <th className="p-4">Visibility</th>
              <th className="p-4">Sentiment</th>
              <th className="p-4">Position</th>
              <th className="p-4">Mentions</th>
              <th className="p-4">Trust score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {rows.map((r) => (
              <tr key={r.name} className={cn(r.name === "Attio" && "bg-white/[0.04]")}>
                <td className="p-4 font-medium text-white">{r.name}</td>
                <td className="p-4 font-mono">{r.visibility}%</td>
                <td className="p-4">
                  <SentimentBadge score={r.sentiment} size="sm" />
                </td>
                <td className="p-4 font-mono">{r.position}</td>
                <td className="p-4 font-mono">{r.mentions}</td>
                <td className="p-4 font-mono">{r.trust}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function TrendIcon({ t }: { t: "up" | "down" | "neutral" }) {
  if (t === "up") return <ArrowUpRight className="h-4 w-4 text-emerald-400" />;
  if (t === "down") return <ArrowDownRight className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-neutral-500" />;
}
