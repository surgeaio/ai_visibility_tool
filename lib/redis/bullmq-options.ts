import type { QueueOptions, WorkerOptions } from "bullmq";

/** Trim completed/failed job history to limit Redis memory and command volume. */
export const BULLMQ_DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 50,
  removeOnFail: 20,
} as const;

/** Lower polling frequency vs BullMQ defaults (~80% fewer stalled checks). */
export const BULLMQ_WORKER_SETTINGS: Pick<
  WorkerOptions,
  "stalledInterval" | "lockDuration" | "maxStalledCount"
> = {
  stalledInterval: 30_000,
  lockDuration: 60_000,
  maxStalledCount: 3,
};

export function withWorkerSettings<T extends WorkerOptions>(opts: T): T {
  return { ...BULLMQ_WORKER_SETTINGS, ...opts };
}

export function withQueueDefaults<T extends QueueOptions>(opts: T): T {
  return {
    defaultJobOptions: BULLMQ_DEFAULT_JOB_OPTIONS,
    ...opts,
  };
}
