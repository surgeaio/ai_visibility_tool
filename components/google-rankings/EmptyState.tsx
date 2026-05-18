"use client";

import Link from "next/link";
import { BarChart3, Link2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gscTheme } from "@/lib/google-rankings/theme";

export function GoogleRankingsEmptyState({
  variant,
  connectHref,
  onSync,
  syncBusy,
}: {
  variant: "no-brand" | "not-connected" | "no-data";
  connectHref?: string;
  onSync?: () => void;
  syncBusy?: boolean;
}) {
  const config = {
    "no-brand": {
      icon: Search,
      title: "Select a client",
      description: "Choose a client from the workspace selector to view their Search Console performance.",
    },
    "not-connected": {
      icon: Link2,
      title: "Connect Google Search Console",
      description:
        "Link this client's Google account to import real clicks, impressions, CTR, and ranking data. We never show placeholder SEO metrics.",
    },
    "no-data": {
      icon: BarChart3,
      title: "No synced ranking data yet",
      description:
        "Search Console is connected. Run a sync to pull the latest metrics — this usually takes 30–90 seconds on the background worker.",
    },
  }[variant];

  const Icon = config.icon;

  return (
    <div className={`${gscTheme.surface} flex flex-col items-center px-6 py-16 text-center`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#333] bg-[#1a1a1a]">
        <Icon className="h-7 w-7 text-[#8ab4f8]" />
      </div>
      <h3 className="text-lg font-semibold text-white">{config.title}</h3>
      <p className="mt-2 max-w-md text-sm text-neutral-400">{config.description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {variant === "not-connected" && connectHref ? (
          <Button asChild>
            <Link href={connectHref}>Connect Search Console</Link>
          </Button>
        ) : null}
        {variant === "no-data" && onSync ? (
          <Button disabled={syncBusy} onClick={onSync}>
            {syncBusy ? "Syncing…" : "Sync now"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
