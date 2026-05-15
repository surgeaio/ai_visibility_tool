"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Eye,
  FileSearch,
  Heart,
  LayoutDashboard,
  Lightbulb,
  LineChart as LineChartIcon,
  MessageSquare,
  Search,
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
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_BRAND } from "@/lib/demo/seed-data";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";
import type { DashboardOverviewPayload } from "@/lib/services/dashboard-overview";
import { cn } from "@/lib/utils";

const KPI_ICONS = {
  Visibility: Eye,
  Sentiment: Heart,
  Position: LineChartIcon,
  "Prompts Tracked": MessageSquare,
};

export default function OverviewPage() {
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);
  const [overview, setOverview] = useState<DashboardOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedBrandId) {
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ brandId: selectedBrandId, range: "30d" });
      const res = await fetch(`/api/dashboard/overview?${params}`, { cache: "no-store" });
      const json = (await res.json()) as DashboardOverviewPayload & { error?: string; requestId?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setOverview(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const siteName = brandName || overview?.brandName || DEMO_BRAND.name;
  const llmAvg = overview?.llmOverall ?? 0;
  const pendingRecs = overview?.recommendations.pending ?? 0;
  const urgentRecs = overview?.recommendations.urgentHigh ?? 0;
  const g = overview?.googleSummary;

  const kpis = overview
    ? [
        {
          title: "Visibility" as const,
          value: `${overview.kpis.visibility}%`,
          change: overview.source === "demo" ? "+5.2% this month" : "Rolling window (LLM runs)",
          trend: "up" as const,
          icon: KPI_ICONS.Visibility,
        },
        {
          title: "Sentiment" as const,
          value: String(overview.kpis.sentiment),
          change: overview.source === "demo" ? "+3 vs last month" : "From LLM sentiment scores",
          trend: "up" as const,
          icon: KPI_ICONS.Sentiment,
        },
        {
          title: "Position" as const,
          value: String(overview.kpis.position),
          change: overview.source === "demo" ? "-0.2 avg rank" : "Avg rank position (LLM)",
          trend: "down" as const,
          icon: KPI_ICONS.Position,
        },
        {
          title: "Prompts Tracked" as const,
          value: String(overview.kpis.promptsTracked),
          change: overview.source === "demo" ? "+12 new prompts" : "Active prompts for this brand",
          trend: "neutral" as const,
          icon: KPI_ICONS["Prompts Tracked"],
        },
      ]
    : [];

  const donutData = overview
    ? [
        { name: "Positive", value: overview.sentimentDist.positive, fill: "#22c55e" },
        { name: "Neutral", value: overview.sentimentDist.neutral, fill: "#eab308" },
        { name: "Negative", value: overview.sentimentDist.negative, fill: "#ef4444" },
      ]
    : [];

  if (!selectedBrandId) {
    return (
      <div className="space-y-6">
        <DashboardEmptyState
          title="Select a brand"
          description="Choose a client from the sidebar to load dashboard metrics."
        />
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading overview…</p>;
  }

  if (error) {
    return (
      <Card className="border-red-900/50 bg-[#111]">
        <CardContent className="p-6 text-sm text-red-300">{error}</CardContent>
      </Card>
    );
  }

  if (!overview) {
    return null;
  }

  const emptyLive =
    overview.source === "live" &&
    overview.activity.length === 0 &&
    overview.kpis.promptsTracked === 0 &&
    (overview.llmOverall === null || overview.llmOverall === 0);

  return (
    <div className="space-y-8">
      {emptyLive ? (
        <DashboardEmptyState
          title="No tracking data yet"
          description="Add prompts and API keys, then run a prompt check. Data will appear here after the first successful LLM run."
          icon={LayoutDashboard}
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/prompts"
                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                Add prompts
              </Link>
              <Link href="/dashboard/settings/api-keys" className="text-sm text-sky-400 hover:underline">
                API keys
              </Link>
            </div>
          }
        />
      ) : null}

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLinkCard
          title="LLM visibility"
          value={`${llmAvg}/100`}
          sub="Average across tracked LLM platforms"
          href="/dashboard/llm-visibility"
          icon={Bot}
        />
        <QuickLinkCard
          title="Google avg position"
          value={g ? String(g.avgPosition) : "—"}
          sub={g ? "From Search Console + Serper rows" : "Connect GSC or run Serper check"}
          href="/dashboard/google-rankings"
          icon={Search}
        />
        <QuickLinkCard
          title="Open tasks"
          value={String(pendingRecs)}
          sub={`${urgentRecs} high priority`}
          href="/dashboard/recommendations"
          icon={Lightbulb}
        />
        <QuickLinkCard
          title="Website audit"
          value="Run checklist"
          sub="Indexing, meta tags, thin content"
          href="/dashboard/website-audit"
          icon={FileSearch}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Visibility over time</CardTitle>
            <p className="text-xs text-neutral-500">
              {overview.source === "demo" ? "Demo multi-brand trend" : "Daily average visibility score"}
            </p>
          </CardHeader>
          {overview.source === "live" ? (
            <VisibilityChart simpleTrend={overview.visibilityTrend} />
          ) : (
            <VisibilityChart />
          )}
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
            <p className="text-xs text-neutral-500">Competitors vs you (rank when available)</p>
          </CardHeader>
          <div className="h-[260px] space-y-3">
            {overview.positionRanking.map((row) => (
              <div key={row.name}>
                <div className="mb-1 flex justify-between text-xs text-neutral-400">
                  <span className={row.highlight ? "font-medium text-white" : ""}>{row.name}</span>
                  <span className="font-mono">{row.position > 0 ? row.position : "—"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      row.highlight ? "bg-white" : "bg-neutral-600",
                    )}
                    style={{
                      width:
                        row.position > 0
                          ? `${Math.min(100, (5 - row.position + 0.5) * 22)}%`
                          : "8%",
                    }}
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
              <BarChart data={overview.modelCoverage}>
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
        {overview.activity.length === 0 ? (
          <p className="py-6 text-sm text-neutral-500">No LLM runs in this window yet.</p>
        ) : (
          <div className="divide-y divide-[#262626]">
            {overview.activity.map((a) => (
              <button
                key={a.id}
                type="button"
                className="flex w-full items-center gap-4 py-4 text-left transition-colors duration-200 hover:bg-[#1a1a1a]/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{a.prompt}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {siteName} · {a.model} · {new Date(a.at).toLocaleString()}
                  </p>
                  {a.excerpt ? <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{a.excerpt}</p> : null}
                </div>
                {a.sentiment != null ? (
                  <SentimentBadge score={a.sentiment} size="sm" />
                ) : (
                  <span className="text-xs text-neutral-500">N/A</span>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-neutral-600">
        Source: <span className="font-mono text-neutral-400">{overview.source}</span> · Site label:{" "}
        <span className="font-mono text-neutral-400">{siteName.toLowerCase()}</span>
      </p>
    </div>
  );
}

function Trend({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-neutral-500" />;
}

function QuickLinkCard({
  title,
  value,
  sub,
  href,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full border-[#262626] bg-[#111] transition-colors duration-200 hover:border-neutral-500">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-neutral-400">{title}</CardTitle>
          <Icon className="h-4 w-4 text-neutral-500 group-hover:text-white" />
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-semibold text-white">{value}</p>
          <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{sub}</p>
          <p className="mt-3 flex items-center gap-1 text-xs font-medium text-neutral-400 group-hover:text-white">
            Open <ArrowRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
