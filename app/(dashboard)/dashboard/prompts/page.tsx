"use client";

import { useMemo, useState } from "react";
import { Download, MoreHorizontal, Plus, Play } from "lucide-react";
import { SentimentBadge } from "@/components/dashboard/SentimentBadge";
import { ResponseViewer } from "@/components/dashboard/ResponseViewer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DEMO_PROMPTS } from "@/lib/demo-data";

const DEMO_RESPONSE =
  "For startups comparing CRMs, HubSpot remains popular for breadth while Attio stands out for a modern UX and flexible data model. Salesforce leads enterprise complexity.";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState(DEMO_PROMPTS);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [category, setCategory] = useState("CRM");
  const [runNow, setRunNow] = useState(true);

  const detail = useMemo(() => prompts.find((p) => p.id === detailId), [prompts, detailId]);

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  function addPrompt() {
    if (!newPrompt.trim()) return;
    setPrompts((prev) => [
      {
        id: crypto.randomUUID(),
        text: newPrompt.trim(),
        category,
        visibility: false,
        sentiment: null,
        lastRun: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewPrompt("");
    setModalOpen(false);
  }

  function exportCsv() {
    const rows = prompts.map((p) =>
      [p.text, p.category, p.lastRun, p.visibility, p.sentiment ?? ""].join(","),
    );
    const blob = new Blob([["Prompt,Category,Last Run,Visibility,Sentiment\n", ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Prompts</h2>
          <p className="text-sm text-neutral-500">Manage tracked prompts and review multi-model responses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <Button variant="secondary" size="sm">
              <Play className="mr-2 h-4 w-4" />
              Run selected ({selectedIds.length})
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Prompt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add prompt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="pt">Prompt text</Label>
                  <Input
                    id="pt"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="e.g. Best CRM for startups"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["CRM", "AI Tools", "Marketing", "SEO", "Sales"].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="run" checked={runNow} onCheckedChange={(v) => setRunNow(Boolean(v))} />
                  <Label htmlFor="run">Run immediately</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addPrompt}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#111]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#262626] bg-[#0a0a0a] text-xs uppercase text-neutral-500">
            <tr>
              <th className="w-10 p-4">
                <Checkbox
                  checked={selectedIds.length === prompts.length && prompts.length > 0}
                  onCheckedChange={(v) => {
                    const next = Boolean(v);
                    const map: Record<string, boolean> = {};
                    prompts.forEach((p) => {
                      map[p.id] = next;
                    });
                    setSelected(map);
                  }}
                />
              </th>
              <th className="p-4 font-medium">Prompt</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Last run</th>
              <th className="p-4 font-medium">Visibility</th>
              <th className="p-4 font-medium">Sentiment</th>
              <th className="w-12 p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {prompts.map((p) => (
              <tr key={p.id} className="hover:bg-[#1a1a1a]/50">
                <td className="p-4">
                  <Checkbox
                    checked={!!selected[p.id]}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: Boolean(v) }))}
                  />
                </td>
                <td className="max-w-xs truncate p-4 text-neutral-200">{p.text}</td>
                <td className="p-4 text-neutral-400">{p.category}</td>
                <td className="p-4 font-mono text-xs text-neutral-500">
                  {new Date(p.lastRun).toLocaleDateString()}
                </td>
                <td className="p-4">{p.visibility ? <span className="text-emerald-400">Yes</span> : "No"}</td>
                <td className="p-4">
                  {p.sentiment != null ? <SentimentBadge score={p.sentiment} size="sm" /> : "—"}
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailId(p.id)}>View results</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={() => setPrompts((prev) => prev.filter((x) => x.id !== p.id))}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Prompt detail</SheetTitle>
            <SheetDescription className="text-left">{detail?.text}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">ChatGPT · excerpt</p>
              <ResponseViewer text={DEMO_RESPONSE} brandName="Attio" competitorNames={["HubSpot", "Salesforce"]} />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Claude · excerpt</p>
              <ResponseViewer text={DEMO_RESPONSE} brandName="Attio" competitorNames={["HubSpot"]} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
