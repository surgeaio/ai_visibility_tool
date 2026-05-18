/** Centralized dark analytics theme (GSC-inspired, SaaS branded). */
export const gscTheme = {
  page: "min-h-0 space-y-6",
  surface: "rounded-2xl border border-[#2a2a2a] bg-[#141414] shadow-sm",
  surfaceMuted: "rounded-xl border border-[#262626] bg-[#111111]",
  header: "text-2xl font-semibold tracking-tight text-white",
  subheader: "text-sm text-neutral-400",
  metricLabel: "text-xs font-medium uppercase tracking-wide text-neutral-500",
  metricValue: "text-2xl font-semibold tabular-nums text-white",
  tableHead: "sticky top-0 z-10 bg-[#141414] text-left text-xs font-medium uppercase tracking-wide text-neutral-500",
  tableRow: "border-b border-[#262626]/80 transition-colors hover:bg-[#1a1a1a]/80",
  tableCell: "px-4 py-3 text-sm text-neutral-200",
  tableCellMuted: "px-4 py-3 text-sm text-neutral-400",
  positive: "text-emerald-400",
  negative: "text-red-400",
  chartGrid: "#262626",
  chartTick: "#a3a3a3",
  tooltip: { background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 },
} as const;
