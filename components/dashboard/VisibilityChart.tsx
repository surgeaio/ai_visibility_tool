"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DEMO_CHART_DATA } from "@/lib/demo/seed-data";

const COLORS: Record<string, string> = {
  attio: "#ffffff",
  hubspot: "#737373",
  salesforce: "#525252",
};

export type SimpleTrendPoint = { label: string; score: number };

export function VisibilityChart({
  data = DEMO_CHART_DATA.visibility,
  brandKey = "attio",
  competitorKeys = ["hubspot", "salesforce"],
  simpleTrend,
}: {
  data?: typeof DEMO_CHART_DATA.visibility;
  brandKey?: string;
  competitorKeys?: string[];
  /** When set, renders a single “visibility score” line from live overview data. */
  simpleTrend?: SimpleTrendPoint[];
}) {
  if (simpleTrend?.length) {
    return (
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={simpleTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="#737373" tick={{ fill: "#737373", fontSize: 12 }} />
            <YAxis
              stroke="#737373"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#737373", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111111",
                border: "1px solid #262626",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value) => [`${value ?? 0}%`, "Visibility"]}
            />
            <Line type="monotone" dataKey="score" name="Visibility" stroke="#fff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#737373" tick={{ fill: "#737373", fontSize: 12 }} />
          <YAxis
            stroke="#737373"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#737373", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111111",
              border: "1px solid #262626",
              borderRadius: "8px",
              color: "#fff",
            }}
            formatter={(value, name) => [`${value ?? 0}%`, String(name ?? "")]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey={brandKey}
            name="Your brand"
            stroke={COLORS[brandKey] ?? "#fff"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {competitorKeys.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={k.charAt(0).toUpperCase() + k.slice(1)}
              stroke={COLORS[k] ?? "#525252"}
              strokeWidth={1.5}
              strokeOpacity={0.85}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
