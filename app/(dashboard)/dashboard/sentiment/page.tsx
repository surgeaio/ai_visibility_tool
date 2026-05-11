"use client";

import { PatternCard } from "@/components/dashboard/PatternCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_PATTERNS, DEMO_SENTENCES, DEMO_SENTIMENT_KEYWORDS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const SCORE = 72;

export default function SentimentPage() {
  const tone =
    SCORE >= 61 ? "text-emerald-400" : SCORE >= 41 ? "text-yellow-400" : "text-red-400";
  const stroke =
    SCORE >= 61 ? "#22c55e" : SCORE >= 41 ? "#eab308" : "#ef4444";

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center p-8">
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
                strokeDasharray={`${(SCORE / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-mono text-4xl font-semibold", tone)}>{SCORE}</span>
              <span className="text-xs text-neutral-500">overall</span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-neutral-400">Rolls up model-level mention tone into one score.</p>
        </Card>

        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base text-white">Sentiment breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            <Bar label="Positive" pct={62} color="bg-emerald-500" />
            <Bar label="Neutral" pct={28} color="bg-yellow-500" />
            <Bar label="Negative" pct={10} color="bg-red-500" />
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Pattern detection</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_PATTERNS.map((p) => (
            <PatternCard
              key={p.title}
              severity={p.severity === "high" ? "high" : "medium"}
              title={p.title}
              typeLabel={p.type.replace(/_/g, " ")}
              evidence={p.evidence}
              recommendations={p.recommendations}
            />
          ))}
        </div>
      </div>

      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base text-white">Keyword cloud</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 px-0">
          {DEMO_SENTIMENT_KEYWORDS.map((k) => (
            <span
              key={k.word}
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                k.sentiment === "positive" && "bg-emerald-500/15 text-emerald-300",
                k.sentiment === "neutral" && "bg-yellow-500/15 text-yellow-200",
                k.sentiment === "negative" && "bg-red-500/15 text-red-300",
              )}
              style={{ fontSize: `${10 + k.weight / 4}px` }}
            >
              {k.word}
            </span>
          ))}
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base text-white">Sentence-level mentions</CardTitle>
        </CardHeader>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All models</TabsTrigger>
            <TabsTrigger value="gpt">ChatGPT</TabsTrigger>
            <TabsTrigger value="claude">Claude</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-neutral-500">
                <tr>
                  <th className="p-3">Sentence</th>
                  <th className="p-3">Sentiment</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {DEMO_SENTENCES.map((s, i) => (
                  <tr key={i}>
                    <td className="p-3 text-neutral-300">{s.sentence}</td>
                    <td className="p-3 capitalize text-neutral-200">{s.sentiment}</td>
                    <td className="p-3 font-mono text-neutral-400">{s.confidence}%</td>
                    <td className="p-3 text-neutral-500">{s.model}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>
          <TabsContent value="gpt">
            <p className="mt-4 text-sm text-neutral-500">Filter wiring hooks to model tags on live data.</p>
          </TabsContent>
          <TabsContent value="claude">
            <p className="mt-4 text-sm text-neutral-500">Filter wiring hooks to model tags on live data.</p>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
