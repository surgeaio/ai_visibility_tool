"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RankPositionChart({
  data,
}: {
  data: { label: string; position: number }[];
}) {
  return (
    <div className="h-[240px] w-full min-h-[200px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="label" tick={{ fill: "#a3a3a3", fontSize: 10 }} axisLine={{ stroke: "#262626" }} />
          <YAxis
            reversed
            domain={[1, "auto"]}
            tick={{ fill: "#a3a3a3", fontSize: 11 }}
            axisLine={{ stroke: "#262626" }}
            label={{ value: "Rank (lower is better)", angle: -90, position: "insideLeft", fill: "#737373", fontSize: 11 }}
          />
          <Tooltip contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }} />
          <Line type="monotone" dataKey="position" name="Avg rank" stroke="#f472b6" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
