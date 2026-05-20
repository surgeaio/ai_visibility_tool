"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { useDashboardStore } from "@/store/dashboard";

type Quote = {
  ai_model: string;
  brand_mention_context: string | null;
  brand_sentiment: number | null;
  run_date: string;
};

type SentimentPayload = {
  brandName?: string;
  summary: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    avgScore: number | null;
  };
  positiveQuotes: Quote[];
  neutralQuotes: Quote[];
  negativeQuotes: Quote[];
};

export default function SentimentPage() {
  const { selectedBrandId } = useSelectedBrand();
  const brandName = useDashboardStore((s) => s.brandName);
  const [data, setData] = useState<SentimentPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBrandId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    void fetch(`/api/visibility/sentiment-detail?brandId=${selectedBrandId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: SentimentPayload & { error?: string }) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((e) => {
        const message =
          e instanceof Error && e.name === "AbortError"
            ? "Request timed out. Run prompts on LLM Visibility first."
            : e instanceof Error
              ? e.message
              : "Failed to load";
        setError(message);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, [selectedBrandId]);

  if (!selectedBrandId) {
    return (
      <div className="rounded-xl border border-[#262626] bg-[#111] px-6 py-12 text-center text-neutral-400">
        Select a client from the sidebar to view sentiment analysis.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading sentiment data…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!data || data.summary.total === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Sentiment Analysis</h2>
          <p className="text-sm text-neutral-500">
            How AI models describe {brandName || data?.brandName || "your brand"}
          </p>
        </div>
        <Card className="border-[#262626] bg-[#111]">
          <CardContent className="p-8 text-center text-neutral-500">
            No brand mentions found yet. Run prompts from LLM Visibility to collect sentiment data.
          </CardContent>
        </Card>
      </div>
    );
  }

  const score = data.summary.avgScore ?? 50;
  const tone = score >= 61 ? "text-emerald-400" : score >= 41 ? "text-yellow-400" : "text-red-400";
  const stroke = score >= 61 ? "#22c55e" : score >= 41 ? "#eab308" : "#ef4444";
  const total = data.summary.total || 1;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">Sentiment Analysis</h2>
        <p className="text-sm text-neutral-500">
          How AI models describe {brandName || data.brandName || "your brand"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center border-[#262626] bg-[#111] p-8">
          <div className="relative h-44 w-44">
            <svg className="-rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a1a" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={stroke}
                strokeWidth="10"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-mono text-4xl font-semibold", tone)}>{score}</span>
              <span className="text-xs text-neutral-500">overall</span>
            </div>
          </div>
        </Card>

        <Card className="border-[#262626] bg-[#111] p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Sentiment breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            <Bar label="Positive" pct={Math.round((data.summary.positive / total) * 100)} color="bg-emerald-500" />
            <Bar label="Neutral" pct={Math.round((data.summary.neutral / total) * 100)} color="bg-yellow-500" />
            <Bar label="Negative" pct={Math.round((data.summary.negative / total) * 100)} color="bg-red-500" />
          </CardContent>
        </Card>
      </div>

      <QuoteList title="What AI says positively" quotes={data.positiveQuotes} />
      <QuoteList title="Neutral mentions" quotes={data.neutralQuotes} />
      <QuoteList title="Concerns / negative mentions" quotes={data.negativeQuotes} />

      <Card className="border-[#262626] bg-[#111] p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base text-white">How to improve sentiment</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-400">
            <li>Address negative themes through fresh content (blog posts, case studies)</li>
            <li>Get positive reviews on G2, Capterra, Trustpilot — AI cites these heavily</li>
            <li>Publish thought leadership on LinkedIn — a frequent AI source</li>
            <li>Respond to Reddit and community threads where your brand is discussed</li>
            <li>Check Recommendations for personalized GEO actions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="font-mono text-neutral-300">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#262626]">
        <div className={cn("h-2 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuoteList({ title, quotes }: { title: string; quotes: Quote[] }) {
  if (!quotes.length) return null;
  return (
    <Card className="border-[#262626] bg-[#111] p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-0">
        {quotes.map((q, i) => (
          <div key={`${q.ai_model}-${i}`} className="border-l-2 border-[#262626] py-1 pl-3">
            <p className="text-sm text-neutral-200">&ldquo;{q.brand_mention_context}&rdquo;</p>
            <p className="mt-1 text-xs text-neutral-500">
              {q.ai_model} · {q.run_date} · Score: {q.brand_sentiment ?? "—"}/100
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
