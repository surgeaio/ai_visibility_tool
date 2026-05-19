"use client";

import type { ReactNode } from "react";
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
import type { LlmVisibilityBrand, LlmVisibilityChartRow } from "@/lib/types/llm-visibility-dashboard";
import { llmVisibilityBrandKey } from "@/lib/services/llm-visibility-dashboard";

const BRAND_COLORS = ["#ef4444", "#22c55e", "#eab308", "#a855f7", "#3b82f6", "#f97316"];

export function VisibilityCharts({
  data,
  brands,
}: {
  data: LlmVisibilityChartRow[];
  brands: LlmVisibilityBrand[];
}) {
  if (!data.length || !brands.length) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartShell title="Visibility Over Time" subtitle="Avg Visibility %">
          <p className="flex h-[250px] items-center justify-center text-sm text-neutral-500">
            No chart data for this range.
          </p>
        </ChartShell>
        <ChartShell title="Ranking Over Time" subtitle="Avg Rank">
          <p className="flex h-[250px] items-center justify-center text-sm text-neutral-500">
            No chart data for this range.
          </p>
        </ChartShell>
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartShell title="Visibility Over Time" subtitle="Avg Visibility %">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ background: "#111", border: "1px solid #262626" }}
              formatter={(value) => [`${value ?? 0}%`, ""]}
              labelFormatter={(d) =>
                new Date(d).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              }
            />
            <Legend />
            {brands.map((brand, i) => {
              const key = llmVisibilityBrandKey(brand.name);
              return (
                <Line
                  key={brand.id}
                  type="monotone"
                  dataKey={key}
                  name={brand.name}
                  stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Ranking Over Time" subtitle="Avg Rank">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              }
            />
            <YAxis reversed tick={{ fontSize: 11, fill: "#a3a3a3" }} domain={[1, 5]} />
            <Tooltip contentStyle={{ background: "#111", border: "1px solid #262626" }} />
            <Legend />
            {brands.map((brand, i) => {
              const key = `${llmVisibilityBrandKey(brand.name)}_rank`;
              return (
                <Line
                  key={brand.id}
                  type="monotone"
                  dataKey={key}
                  name={brand.name}
                  stroke={BRAND_COLORS[i % BRAND_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#111] p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mb-4 text-xs text-neutral-500">{subtitle}</p>
      {children}
    </div>
  );
}
