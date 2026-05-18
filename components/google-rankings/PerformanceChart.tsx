"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { gscTheme } from "@/lib/google-rankings/theme";
import { cn } from "@/lib/utils";

type TrendPoint = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

const METRICS = [
  { id: "clicks" as const, label: "Clicks", color: "#4285f4" },
  { id: "impressions" as const, label: "Impressions", color: "#8ab4f8" },
  { id: "ctr" as const, label: "CTR", color: "#34a853" },
  { id: "position" as const, label: "Position", color: "#fbbc04" },
];

export function PerformanceChart({ data }: { data: TrendPoint[] }) {
  const [active, setActive] = useState<"clicks" | "impressions" | "ctr" | "position">("clicks");

  if (!data.length) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-neutral-500">
        No performance data for this period.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
    ctrPct: d.ctr * 100,
  }));

  const isPosition = active === "position";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActive(m.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active === m.id
                ? "border-[#4285f4] bg-[#4285f4]/15 text-[#8ab4f8]"
                : "border-[#333] bg-[#1a1a1a] text-neutral-400 hover:border-[#444]",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="h-[320px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gscTheme.chartGrid} />
            <XAxis dataKey="label" tick={{ fill: gscTheme.chartTick, fontSize: 11 }} axisLine={{ stroke: "#333" }} />
            <YAxis
              yAxisId="left"
              reversed={isPosition}
              tick={{ fill: gscTheme.chartTick, fontSize: 11 }}
              axisLine={{ stroke: "#333" }}
            />
            <Tooltip
              contentStyle={gscTheme.tooltip}
              formatter={(value, name) => {
                const v = Number(value ?? 0);
                const n = String(name ?? "");
                if (n === "ctrPct") return [`${v.toFixed(2)}%`, "CTR"];
                if (n === "position") return [v.toFixed(1), "Position"];
                return [v.toLocaleString(), n];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3" }} />
            {active === "clicks" ? (
              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#4285f4" strokeWidth={2} dot={false} />
            ) : null}
            {active === "impressions" ? (
              <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#8ab4f8" strokeWidth={2} dot={false} />
            ) : null}
            {active === "ctr" ? (
              <Line yAxisId="left" type="monotone" dataKey="ctrPct" name="CTR" stroke="#34a853" strokeWidth={2} dot={false} />
            ) : null}
            {active === "position" ? (
              <Line yAxisId="left" type="monotone" dataKey="position" stroke="#fbbc04" strokeWidth={2} dot={false} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
