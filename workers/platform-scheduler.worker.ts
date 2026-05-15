import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { PLATFORM_SCHEDULER_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { PlatformSchedulerJobName } from "@/lib/queues/types";
import { runDuePromptSchedules } from "@/lib/services/prompt-schedule-runner";
import { syncAllActiveGscConnections } from "@/lib/services/gsc-sync";

export function registerPlatformSchedulerWorker(connection: IORedis) {
  const worker = new Worker<unknown, unknown, PlatformSchedulerJobName>(
    PLATFORM_SCHEDULER_QUEUE_NAME,
    async (job) => {
      if (job.name === "prompt-schedules") {
        const result = await runDuePromptSchedules();
        console.log("[platform-scheduler] prompt-schedules", result);
        return result;
      }
      if (job.name === "gsc-sync") {
        const result = await syncAllActiveGscConnections();
        console.log("[platform-scheduler] gsc-sync", result);
        return result;
      }
      throw new Error(`Unknown scheduler job: ${job.name}`);
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    console.error("[platform-scheduler] failed", job?.name, job?.id, err);
  });

  return worker;
}
