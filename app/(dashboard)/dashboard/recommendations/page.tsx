"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_RECOMMENDATIONS } from "@/lib/demo/seed-data";
import { useDashboardStore } from "@/store/dashboard";
import { cn } from "@/lib/utils";

export default function RecommendationsPage() {
  const completed = useDashboardStore((s) => s.recommendationCompleted);
  const toggle = useDashboardStore((s) => s.toggleRecommendationDone);
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return DEMO_RECOMMENDATIONS.filter((r) => {
      if (priority !== "all" && r.priority !== priority) return false;
      const done = !!completed[r.id] || r.status === "done";
      if (status === "pending" && done) return false;
      if (status === "done" && !done) return false;
      return true;
    });
  }, [priority, status, completed]);

  const total = DEMO_RECOMMENDATIONS.length;
  const doneCount = DEMO_RECOMMENDATIONS.filter(
    (r) => !!completed[r.id] || r.status === "done",
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          <p className="text-sm text-neutral-500">Prioritized plays generated from detected patterns.</p>
          <p className="mt-2 text-sm text-neutral-400">
            Progress: <span className="font-mono text-white">{doneCount}</span> of{" "}
            <span className="font-mono text-white">{total}</span> completed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="patterns">
        <TabsList>
          <TabsTrigger value="patterns">Pattern type</TabsTrigger>
          <TabsTrigger value="content">Content tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="patterns" className="mt-6 space-y-4">
          {filtered.map((r) => (
            <RecommendationCard
              key={r.id}
              title={r.title}
              pattern={r.pattern}
              priority={r.priority}
              actions={r.actions}
              impact={r.impact}
              done={!!completed[r.id] || r.status === "done"}
              onToggle={() => toggle(r.id)}
            />
          ))}
        </TabsContent>
        <TabsContent value="content" className="mt-6 text-sm text-neutral-500">
          Group content tasks by owner and sync to your CMS—wire-up placeholder for production workflows.
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendationCard({
  title,
  pattern,
  priority,
  actions,
  impact,
  done,
  onToggle,
}: {
  title: string;
  pattern: string;
  priority: string;
  actions: string[];
  impact: string;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={cn("border-[#262626]", done && "opacity-60")}>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
              [{priority.toUpperCase()} IMPACT]
            </span>
            <p className="mt-1 text-xs text-neutral-500">Pattern: {pattern.replace(/_/g, " ")}</p>
            <p className="mt-4 text-base font-medium text-white">📌 {title}</p>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase text-neutral-500">Recommended actions</p>
              <ul className="space-y-2 text-sm text-neutral-300">
                {actions.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span className="text-emerald-400">✦</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-sm text-neutral-400">
              Expected impact: <span className="font-mono text-white">{impact}</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={onToggle}>
              {done ? "Mark pending" : "Mark as done"}
            </Button>
            <Button size="sm">Start task</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
