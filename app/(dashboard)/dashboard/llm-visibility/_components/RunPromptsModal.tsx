"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RunPromptsModal({ open, onClose, onSuccess }: Props) {
  const [promptsText, setPromptsText] = useState("");
  const [running, setRunning] = useState(false);
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);

  async function handleRun() {
    const prompts = promptsText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length >= 5);

    if (prompts.length === 0) {
      toast.error("Enter at least one prompt (5+ characters per line)");
      return;
    }
    if (prompts.length > 10) {
      toast.error("Maximum 10 prompts per batch");
      return;
    }
    if (!selectedBrandId) {
      toast.error("Select a client first");
      return;
    }

    setRunning(true);
    try {
      const res = await fetch("/api/prompts/batch-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts,
          brandId: selectedBrandId,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        results?: Array<{ status: string }>;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Failed to run prompts");
        return;
      }

      const list = data.results ?? [];
      const completed = list.filter((r) => r.status === "completed").length;
      const queued = list.filter((r) => r.status === "queued").length;
      const failed = list.filter((r) => r.status === "failed").length;

      if (failed > 0) {
        toast.warning(`${completed + queued} started, ${failed} failed`);
      } else {
        toast.success(
          queued > 0 && completed === 0
            ? `${queued} prompt(s) queued`
            : `${completed + queued} prompt(s) completed`,
        );
      }

      setPromptsText("");
      onClose();
      onSuccess();
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent className="border-[#262626] bg-[#0a0a0a] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run prompts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-prompts" className="text-neutral-400">
              One prompt per line (max 10)
            </Label>
            <textarea
              id="batch-prompts"
              value={promptsText}
              onChange={(e) => setPromptsText(e.target.value)}
              placeholder={
                "What is the best CRM for startups?\nTop SaaS RFP response tools\nBest AI visibility platforms"
              }
              rows={6}
              disabled={running}
              className="mt-2 w-full resize-y rounded-md border border-[#262626] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>

          {brandName ? (
            <p className="text-xs text-neutral-500">
              Brand: <span className="text-neutral-300">{brandName}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onClose} disabled={running}>
            Cancel
          </Button>
          <Button onClick={() => void handleRun()} disabled={running}>
            {running ? "Running…" : "Run now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
