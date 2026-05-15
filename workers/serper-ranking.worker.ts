import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { SERPER_RANKING_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { SerperRankingJobData } from "@/lib/queues/types";
import { executeSerperRankingJob } from "@/lib/services/serper-ranking-job";

export function registerSerperRankingWorker(connection: IORedis) {
  return new Worker<SerperRankingJobData>(
    SERPER_RANKING_QUEUE_NAME,
    async (job) => {
      const result = await executeSerperRankingJob(job.data);
      console.log("[serper-ranking]", job.id, {
        brandId: job.data.brandId,
        rowsWritten: result.rowsWritten,
        errors: result.errors.length,
      });
      return result;
    },
    { connection, concurrency: 2 },
  );
}
