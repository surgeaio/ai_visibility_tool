"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { gscTheme } from "@/lib/google-rankings/theme";

export function GoogleRankingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={`${gscTheme.surfaceMuted} h-28`} />
        ))}
      </div>
      <Skeleton className={`${gscTheme.surface} h-[380px]`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className={`${gscTheme.surface} h-96`} />
        <Skeleton className={`${gscTheme.surface} h-96`} />
      </div>
    </div>
  );
}
