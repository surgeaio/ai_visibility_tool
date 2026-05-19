import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { withWorkerSettings } from "@/lib/redis/bullmq-options";
import { SENTIMENT_ANALYSIS_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { SentimentAnalysisJobData } from "@/lib/queues/types";

export function registerSentimentAnalysisWorker(connection: IORedis) {
  return new Worker<SentimentAnalysisJobData>(
    SENTIMENT_ANALYSIS_QUEUE_NAME,
    async (job) => {
      console.log("[sentiment-analysis]", job.id, job.data);
      return { ok: true as const };
    },
    withWorkerSettings({ connection, concurrency: 2 }),
  );
}
