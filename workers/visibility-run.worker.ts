import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { VISIBILITY_RUN_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { VisibilityRunJobData } from "@/lib/queues/types";
import { withWorkerSettings } from "@/lib/redis/bullmq-options";
import { runAllPromptsForBrand } from "@/lib/services/visibility-orchestrator";

export function registerVisibilityRunWorker(connection: IORedis) {
  const worker = new Worker<VisibilityRunJobData>(
    VISIBILITY_RUN_QUEUE_NAME,
    async (job) => {
      console.log("[visibility-run] start", job.id, { brandId: job.data.brandId });
      const result = await runAllPromptsForBrand(
        job.data.brandId,
        job.data.triggeredBy ?? "manual",
        job.data.userId,
      );
      console.log("[visibility-run] done", job.id, result);
      return result;
    },
    withWorkerSettings({
      connection,
      concurrency: 1,
      lockDuration: 300_000,
    }),
  );

  worker.on("failed", (job, err) => {
    console.error("[visibility-run] failed", job?.id, job?.data?.brandId, err);
  });

  return worker;
}
