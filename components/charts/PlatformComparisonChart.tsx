"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PlatformBarDatum {
  name: string;
  score: number;
}

export function PlatformComparisonChart({ data }: { data: PlatformBarDatum[] }) {
  const isPlaceholder =
    !data?.length || (data.length === 1 && data[0]?.name === "—");

  if (isPlaceholder) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-neutral-500">
        No data yet — run some prompts to see this chart.
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#a3a3a3", fontSize: 11 }}
            axisLine={{ stroke: "#262626" }}
            label={{ value: "Score (0–100)", angle: -90, position: "insideLeft", fill: "#737373", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend wrapperStyle={{ color: "#a3a3a3", fontSize: 12 }} />
          <Bar dataKey="score" name="Visibility" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
