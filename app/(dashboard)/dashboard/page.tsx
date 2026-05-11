"use client";

import { motion } from "framer-motion";
import {
  Eye,
  Heart,
  LayoutDashboard,
  LineChart as LineChartIcon,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { SentimentBadge } from "@/components/dashboard/SentimentBadge";
import { VisibilityChart } from "@/components/dashboard/VisibilityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_ACTIVITY,
  DEMO_MODEL_COVERAGE,
  DEMO_POSITION_RANKING,
  DEMO_SENTIMENT_DIST,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useBrandMetrics } from "@/store/dashboard";

const KPI_ICONS = {
  Visibility: Eye,
  Sentiment: Heart,
  Position: LineChartIcon,
  "Prompts Tracked": MessageSquare,
};

export default function OverviewPage() {
  const m = useBrandMetrics();

  const kpis = [
    {
      title: "Visibility" as const,
      value: `${m.visibility}%`,
      change: "+5.2% this month",
      trend: "up" as const,
      icon: KPI_ICONS.Visibility,
    },
    {
      title: "Sentiment" as const,
      value: String(m.sentiment),
      change: "+3 vs last month",
      trend: "up" as const,
      icon: KPI_ICONS.Sentiment,
    },
    {
      title: "Position" as const,
      value: String(m.position),
      change: "-0.2 avg rank",
      trend: "down" as const,
      icon: KPI_ICONS.Position,
    },
    {
      title: "Prompts Tracked" as const,
      value: String(m.promptsTracked),
      change: "+12 new prompts",
      trend: "neutral" as const,
      icon: KPI_ICONS["Prompts Tracked"],
    },
  ];

  const donutData = [
    { name: "Positive", value: DEMO_SENTIMENT_DIST.positive, fill: "#22c55e" },
    { name: "Neutral", value: DEMO_SENTIMENT_DIST.neutral, fill: "#eab308" },
    { name: "Negative", value: DEMO_SENTIMENT_DIST.negative, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">{k.title}</CardTitle>
                <k.icon className="h-4 w-4 text-neutral-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="font-mono text-3xl font-semibold text-white">{k.value}</span>
                  <Trend trend={k.trend} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">{k.change}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Visibility over time</CardTitle>
          </CardHeader>
          <VisibilityChart />
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Sentiment distribution</CardTitle>
          </CardHeader>
          <div className="mx-auto h-[260px] max-w-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {donutData.map((entry, index) => (
                    <Cell key={`c-${index}`} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111",
                    border: "1px solid #262626",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Position ranking</CardTitle>
          </CardHeader>
          <div className="h-[260px] space-y-3">
            {DEMO_POSITION_RANKING.map((row) => (
              <div key={row.name}>
                <div className="mb-1 flex justify-between text-xs text-neutral-400">
                  <span className={row.highlight ? "font-medium text-white" : ""}>{row.name}</span>
                  <span className="font-mono">{row.position}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      row.highlight ? "bg-white" : "bg-neutral-600",
                    )}
                    style={{ width: `${Math.min(100, (5 - row.position + 0.5) * 22)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">AI model coverage</CardTitle>
          </CardHeader>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_MODEL_COVERAGE}>
                <XAxis dataKey="model" stroke="#737373" tick={{ fill: "#737373", fontSize: 11 }} />
                <YAxis stroke="#737373" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111",
                    border: "1px solid #262626",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="visibility" fill="#ffffff" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <LayoutDashboard className="h-4 w-4" />
            Recent activity
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-[#262626]">
          {DEMO_ACTIVITY.map((a) => (
            <button
              key={a.id}
              type="button"
              className="flex w-full items-center gap-4 py-4 text-left transition-colors duration-200 hover:bg-[#1a1a1a]/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{a.prompt}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {a.brand} · {a.model} · {new Date(a.at).toLocaleString()}
                </p>
              </div>
              {a.sentiment != null ? (
                <SentimentBadge score={a.sentiment} size="sm" />
              ) : (
                <span className="text-xs text-neutral-500">N/A</span>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Trend({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-neutral-500" />;
}
