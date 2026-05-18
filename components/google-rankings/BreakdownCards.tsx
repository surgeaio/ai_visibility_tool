"use client";

import { gscTheme } from "@/lib/google-rankings/theme";
import type { CountryRow, DeviceRow } from "@/lib/google-rankings/aggregate";

export function CountriesCard({ items }: { items: CountryRow[] }) {
  return (
    <Section title="Top countries" empty={items.length === 0} emptyHint="Country breakdown requires country dimension in sync.">
      <ul className="space-y-3">
        {items.slice(0, 8).map((c) => (
          <li key={c.country} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-200">{c.country}</span>
              <span className="tabular-nums text-neutral-400">{c.clicks.toLocaleString()} clicks</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#262626]">
              <div
                className="h-full rounded-full bg-[#4285f4]"
                style={{ width: `${Math.min(100, c.share * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function DevicesCard({ items }: { items: DeviceRow[] }) {
  return (
    <Section title="Devices" empty={items.length === 0} emptyHint="Device breakdown requires device dimension in sync.">
      <ul className="space-y-3">
        {items.map((d) => (
          <li key={d.device} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-200">{d.device}</span>
              <span className="tabular-nums text-neutral-400">{(d.share * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#262626]">
              <div className="h-full rounded-full bg-[#34a853]" style={{ width: `${d.share * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function SearchAppearanceCard({
  items,
}: {
  items: { type: string; clicks: number; impressions: number }[];
}) {
  return (
    <Section
      title="Search appearance"
      empty={items.length === 0}
      emptyHint="Rich result types (web, image, video) appear when synced from Search Console."
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#262626] text-left text-xs text-neutral-500">
            <th className="pb-2">Type</th>
            <th className="pb-2 text-right">Clicks</th>
            <th className="pb-2 text-right">Impressions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.type} className="border-b border-[#262626]/60">
              <td className="py-2 capitalize text-neutral-200">{r.type}</td>
              <td className="py-2 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function Section({
  title,
  children,
  empty,
  emptyHint,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
  emptyHint: string;
}) {
  return (
    <div className={`${gscTheme.surface} p-5`}>
      <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
      {empty ? <p className="text-sm text-neutral-500">{emptyHint}</p> : children}
    </div>
  );
}
