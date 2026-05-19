import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { withWorkerSettings } from "@/lib/redis/bullmq-options";
import { TREND_ANALYSIS_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { TrendAnalysisJobData } from "@/lib/queues/types";

export function registerTrendWorker(connection: IORedis) {
  return new Worker<TrendAnalysisJobData>(
    TREND_ANALYSIS_QUEUE_NAME,
    async (job) => {
      console.log("[trend-analysis]", job.id, job.data);
      return { ok: true as const };
    },
    withWorkerSettings({ connection, concurrency: 2 }),
  );
}
