import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { RECOMMENDATION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { RecommendationJobData } from "@/lib/queues/types";

export function registerRecommendationWorker(connection: IORedis) {
  return new Worker<RecommendationJobData>(
    RECOMMENDATION_QUEUE_NAME,
    async (job) => {
      console.log("[recommendation]", job.id, job.data);
      return { ok: true as const };
    },
    { connection, concurrency: 2 },
  );
}
