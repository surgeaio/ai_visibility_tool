import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { GSC_SYNC_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { GscSyncJobData } from "@/lib/queues/types";
import { executeGscSyncJob } from "@/lib/services/gsc-sync-job";

export function registerGscSyncWorker(connection: IORedis) {
  const worker = new Worker<GscSyncJobData>(
    GSC_SYNC_QUEUE_NAME,
    async (job) => {
      console.log("[gsc-sync-worker] start", job.id, { brandId: job.data.brandId });
      const result = await executeGscSyncJob(job.data);
      console.log("[gsc-sync-worker] done", job.id, result);
      return result;
    },
    {
      connection,
      concurrency: 1,
      lockDuration: 300_000,
    },
  );

  worker.on("failed", (job, err) => {
    console.error("[gsc-sync-worker] failed", job?.id, job?.data?.brandId, err);
  });

  return worker;
}
