"use client";

import { gscTheme } from "@/lib/google-rankings/theme";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

export function MetricCard({
  label,
  value,
  change,
  sparkline,
  invertTrend,
}: {
  label: string;
  value: string;
  change: number | null;
  sparkline?: number[];
  invertTrend?: boolean;
}) {
  const chartData = (sparkline ?? []).map((v, i) => ({ i, v }));
  const trendUp = change !== null && change > 0;
  const good = invertTrend ? !trendUp : trendUp;
  const bad = invertTrend ? trendUp : !trendUp;

  return (
    <div className={`${gscTheme.surfaceMuted} p-5`}>
      <p className={gscTheme.metricLabel}>{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className={gscTheme.metricValue}>{value}</p>
        {change !== null ? (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              change === 0 ? "text-neutral-500" : good ? gscTheme.positive : bad ? gscTheme.negative : "text-neutral-500"
            }`}
          >
            {change > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : change < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        ) : null}
      </div>
      {chartData.length > 1 ? (
        <div className="mt-3 h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="v" stroke="#3b82f6" fill="#3b82f620" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
