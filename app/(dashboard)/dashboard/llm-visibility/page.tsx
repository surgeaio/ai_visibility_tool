"use client";

import Link from "next/link";
import { PlatformComparisonChart } from "@/components/charts/PlatformComparisonChart";
import { VisibilityTrendChart } from "@/components/charts/VisibilityTrendChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEMO_LLM_PLATFORM_SCORES,
  DEMO_LLM_TREND,
  DEMO_PROMPTS,
} from "@/lib/demo/seed-data";

function sentimentLabel(s: "positive" | "neutral" | "negative") {
  if (s === "positive") return { text: "Positive", emoji: "😊" };
  if (s === "negative") return { text: "Needs work", emoji: "😟" };
  return { text: "Neutral", emoji: "😐" };
}

export default function LlmVisibilityPage() {
  const overall = Math.round(
    DEMO_LLM_PLATFORM_SCORES.reduce((a, p) => a + p.score, 0) / DEMO_LLM_PLATFORM_SCORES.length,
  );

  const barData = DEMO_LLM_PLATFORM_SCORES.map((p) => ({ name: p.platform, score: p.score }));

  const topPrompts = [...DEMO_PROMPTS]
    .filter((p) => p.sentiment != null)
    .sort((a, b) => (b.sentiment ?? 0) - (a.sentiment ?? 0))
    .slice(0, 5);

  const needsAttention = DEMO_PROMPTS.filter(
    (p) => !p.visibility || (p.sentiment != null && p.sentiment < 72),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">LLM visibility</h2>
          <p className="text-sm text-neutral-500">
            Where AI assistants mention your brand, and how strong those mentions feel.
          </p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          Demo data
        </Badge>
      </div>

      <Card className="border-[#262626] bg-[#111]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">Overall score</CardTitle>
          <p className="text-sm text-neutral-500">Average visibility across the four tracked assistants.</p>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-4xl font-semibold text-white">{overall}</p>
          <p className="mt-1 text-sm text-emerald-400">Up about 5 points vs the previous period (demo).</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DEMO_LLM_PLATFORM_SCORES.map((p) => {
          const s = sentimentLabel(p.sentiment);
          return (
            <Card key={p.platform} className="border-[#262626] bg-[#111]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">{p.platform}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-mono text-2xl text-white">{p.score}/100</p>
                <p className="text-sm text-neutral-400">
                  {s.emoji} {s.text}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Visibility trend</CardTitle>
            <p className="text-sm text-neutral-500">Last few check-ins (demo timeline).</p>
          </CardHeader>
          <VisibilityTrendChart data={DEMO_LLM_TREND} />
        </Card>
        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Compare platforms</CardTitle>
            <p className="text-sm text-neutral-500">Scores from 0 (invisible) to 100 (strong presence).</p>
          </CardHeader>
          <PlatformComparisonChart data={barData} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">Top prompts</CardTitle>
            <p className="text-sm text-neutral-500">Highest sentiment in this demo set.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Prompt</th>
                  <th className="p-3">Avg score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {topPrompts.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/llm-visibility/${p.id}`}
                        className="text-white underline-offset-2 hover:underline"
                      >
                        {p.text}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-neutral-300">{p.sentiment}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-[#262626] bg-[#111]">
          <CardHeader>
            <CardTitle className="text-base text-white">Needs attention</CardTitle>
            <p className="text-sm text-neutral-500">Prompts that are weak or missing in this demo.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#262626] text-xs uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Prompt</th>
                  <th className="p-3">Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {needsAttention.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/llm-visibility/${p.id}`}
                        className="text-white underline-offset-2 hover:underline"
                      >
                        {p.text}
                      </Link>
                    </td>
                    <td className="p-3 text-neutral-400">
                      {!p.visibility ? "Not visible" : "Low score or mixed signals"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
