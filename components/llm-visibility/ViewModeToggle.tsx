"use client";

import { cn } from "@/lib/utils";

export type VisibilityViewMode = "visibility" | "ranking";

export function ViewModeToggle({
  view,
  onChange,
}: {
  view: VisibilityViewMode;
  onChange: (view: VisibilityViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[#262626]">
      <button
        type="button"
        className={cn(
          "px-4 py-1.5 text-sm transition-colors",
          view === "visibility"
            ? "bg-white text-black"
            : "text-neutral-400 hover:text-white",
        )}
        onClick={() => onChange("visibility")}
      >
        Visibility
      </button>
      <button
        type="button"
        className={cn(
          "px-4 py-1.5 text-sm transition-colors",
          view === "ranking" ? "bg-white text-black" : "text-neutral-400 hover:text-white",
        )}
        onClick={() => onChange("ranking")}
      >
        Ranking
      </button>
    </div>
  );
}
