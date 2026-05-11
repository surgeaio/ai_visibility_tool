"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SentimentBadge } from "@/components/dashboard/SentimentBadge";
import { cn } from "@/lib/utils";

type MentionTone = "positive" | "neutral" | "negative";

function toneForBrand(snippet: string): MentionTone {
  const lower = snippet.toLowerCase();
  if (
    lower.includes("expensive") ||
    lower.includes("limited") ||
    lower.includes("negative") ||
    lower.includes("steep")
  )
    return "negative";
  if (lower.includes("best") || lower.includes("praised") || lower.includes("modern") || lower.includes("flexible"))
    return "positive";
  return "neutral";
}

export function ResponseViewer({
  text,
  brandName,
  competitorNames = [],
}: {
  text: string;
  brandName: string;
  competitorNames?: string[];
}) {
  const brands = useMemo(() => [brandName, ...competitorNames], [brandName, competitorNames]);

  const segments = useMemo(() => {
    const lowerText = text;
    const parts: { s: string; highlight?: MentionTone; isBrand?: boolean }[] = [];
    let cursor = 0;
    const indices: { start: number; end: number; brand: string }[] = [];

    for (const b of brands) {
      const idx = lowerText.toLowerCase().indexOf(b.toLowerCase(), cursor);
      if (idx !== -1) indices.push({ start: idx, end: idx + b.length, brand: b });
    }
    indices.sort((a, b) => a.start - b.start);

    for (const hit of indices) {
      if (hit.start < cursor) continue;
      if (hit.start > cursor) {
        parts.push({ s: lowerText.slice(cursor, hit.start) });
      }
      const snippet = lowerText.slice(Math.max(0, hit.start - 30), Math.min(lowerText.length, hit.end + 30));
      const tone = toneForBrand(snippet);
      parts.push({
        s: lowerText.slice(hit.start, hit.end),
        highlight: tone,
        isBrand: hit.brand === brandName,
      });
      cursor = hit.end;
    }
    if (cursor < lowerText.length) parts.push({ s: lowerText.slice(cursor) });
    return parts;
  }, [text, brands, brandName]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <Card className="p-4 font-mono text-sm leading-relaxed text-neutral-200">
        {segments.map((p, idx) => (
          <span
            key={idx}
            className={cn(
              p.highlight === "positive" && "bg-emerald-500/20 text-emerald-100",
              p.highlight === "negative" && "bg-red-500/20 text-red-100",
              p.highlight === "neutral" && "bg-yellow-500/15 text-yellow-100",
              p.isBrand && "ring-1 ring-yellow-500/40",
            )}
          >
            {p.s}
          </span>
        ))}
      </Card>
      <div className="space-y-3 rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 text-xs text-neutral-400">
        <p className="text-sm font-medium text-white">Mention metrics</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Brand focus</Badge>
          <span className="text-neutral-500">Position estimate</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">Sentiment</span>
          <SentimentBadge score={72} size="sm" />
        </div>
      </div>
    </div>
  );
}
