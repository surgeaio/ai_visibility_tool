import { getPlatformSchedulerQueue } from "@/lib/queues/platform-scheduler.queue";
import type { PlatformSchedulerJobName } from "@/lib/queues/types";

const SCHEDULERS: { name: PlatformSchedulerJobName; pattern: string }[] = [
  { name: "prompt-schedules", pattern: "0 * * * *" },
  { name: "gsc-sync", pattern: "0 6 * * *" },
];

/** Registers BullMQ job schedulers on Railway workers (idempotent on restart). */
export async function registerPlatformSchedulerJobs(): Promise<void> {
  const queue = getPlatformSchedulerQueue();
  if (!queue) {
    console.warn("[scheduler] Redis not configured — skipping repeatable job registration.");
    return;
  }

  for (const { name, pattern } of SCHEDULERS) {
    await queue.upsertJobScheduler(
      name,
      { pattern },
      {
        name,
        data: {},
        opts: {
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      },
    );
    console.log("[scheduler] registered", name, pattern);
  }
}
