/**
 * Queue stubs — BullMQ/Redis removed; all jobs run inline on Vercel serverless.
 * Stubs preserve types for legacy `if (queue)` branches that always take the sync path.
 */
export type {
  PromptExecutionJobData,
  GscSyncJobData,
  SerperRankingJobData,
  VisibilityRunJobData,
} from "@/lib/queues/types";

export interface QueueJobStub {
  id: string;
  getState(): Promise<string>;
  returnvalue: unknown;
  failedReason?: string;
}

export interface QueueStub {
  add(
    name: string,
    data: unknown,
    opts?: unknown,
  ): Promise<{ id: string }>;
  getJob(id: string): Promise<QueueJobStub | undefined>;
}

export function getGscSyncQueue(): QueueStub | null {
  return null;
}

export function getPromptExecutionQueue(): QueueStub | null {
  return null;
}

export function getVisibilityRunQueue(): QueueStub | null {
  return null;
}

export function getSerperRankingQueue(): QueueStub | null {
  return null;
}

export function getPlatformSchedulerQueue(): QueueStub | null {
  return null;
}

export function getRecommendationQueue(): QueueStub | null {
  return null;
}
