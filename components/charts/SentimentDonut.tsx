"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface SentimentSlice {
  name: string;
  value: number;
  color: string;
}

export function SentimentDonut({ data }: { data: SentimentSlice[] }) {
  return (
    <div className="h-[220px] w-full min-h-[200px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="#0a0a0a" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }}
            formatter={(value, name) => [`${Number(value ?? 0)}%`, String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
