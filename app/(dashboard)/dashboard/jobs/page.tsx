"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type QueueCounts = Record<string, number>;

type QueuesPayload = {
  status: string;
  redis?: boolean;
  queues: Record<string, QueueCounts> | null;
  message?: string;
};

export default function JobsPage() {
  const [data, setData] = useState<QueuesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/health/queues");
      const json: unknown = await res.json();
      if (!res.ok) {
        setError(typeof json === "object" && json && "message" in json ? String((json as { message: string }).message) : "Failed to load");
        return;
      }
      setData(json as QueuesPayload);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Jobs & queues</h1>
        <p className="mt-1 text-sm text-neutral-400">
          BullMQ depth and status (polls every 5s). Start Redis and run <code className="text-xs">npm run workers</code>{" "}
          to process prompt runs.
        </p>
      </div>

      <Card className="border-[#262626] bg-[#141414]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base text-white">Queue health</CardTitle>
            <CardDescription>From /api/health/queues</CardDescription>
          </div>
          <Activity className="h-4 w-4 text-emerald-400" aria-hidden />
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-300">
          {error ? <p className="text-red-400">{error}</p> : null}
          {!data && !error ? <p>Loading…</p> : null}
          {data ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">API: {data.status}</Badge>
                <Badge variant="secondary">Redis: {data.redis ? "yes" : "no"}</Badge>
              </div>
              {data.message ? <p className="text-neutral-500">{data.message}</p> : null}
              {data.queues && Object.keys(data.queues).length > 0 ? (
                <pre className="overflow-x-auto rounded-md border border-[#262626] bg-black/40 p-3 text-xs text-neutral-200">
                  {JSON.stringify(data.queues, null, 2)}
                </pre>
              ) : (
                <p className="text-neutral-500">
                  No queue metrics yet. Set <code className="text-xs">REDIS_URL</code> and enqueue via{" "}
                  <code className="text-xs">POST /api/prompts/[id]/run</code>.
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
