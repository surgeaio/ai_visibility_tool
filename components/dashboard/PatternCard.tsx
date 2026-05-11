"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const severityStyle = {
  critical: "border-red-500/40 text-red-400 bg-red-500/10",
  high: "border-orange-500/40 text-orange-400 bg-orange-500/10",
  medium: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
  low: "border-neutral-600 text-neutral-300 bg-neutral-900",
};

export function PatternCard({
  severity,
  title,
  typeLabel,
  evidence,
  recommendations,
}: {
  severity: keyof typeof severityStyle;
  title: string;
  typeLabel: string;
  evidence: string;
  recommendations: string[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-[#262626] bg-[#111111] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant="outline" className={cn("uppercase tracking-wide", severityStyle[severity])}>
            {severity}
          </Badge>
          <p className="text-xs text-neutral-500">{typeLabel}</p>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-neutral-400">{evidence}</p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      {open && (
        <ul className="mt-4 space-y-2 border-t border-[#262626] pt-4 text-sm text-neutral-300">
          {recommendations.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-emerald-400">✦</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary">
          Generate Content
        </Button>
      </div>
    </div>
  );
}
