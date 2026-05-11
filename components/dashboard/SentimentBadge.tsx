"use client";

import { cn } from "@/lib/utils";

function tier(score: number) {
  if (score >= 61) return "green";
  if (score >= 41) return "yellow";
  return "red";
}

export function SentimentBadge({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = tier(score);
  const colors =
    t === "green"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : t === "yellow"
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";
  const sz =
    size === "sm"
      ? "text-xs px-1.5 py-0.5"
      : size === "lg"
        ? "text-base px-3 py-1"
        : "text-sm px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-mono font-semibold tabular-nums",
        colors,
        sz,
        className,
      )}
    >
      {score}
    </span>
  );
}
