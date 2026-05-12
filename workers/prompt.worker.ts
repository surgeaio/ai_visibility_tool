import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { PROMPT_EXECUTION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { PromptExecutionJobData } from "@/lib/queues/types";

export function registerPromptExecutionWorker(connection: IORedis) {
  const worker = new Worker<PromptExecutionJobData>(
    PROMPT_EXECUTION_QUEUE_NAME,
    async (job) => {
      console.log("[prompt-execution]", job.id, job.data);
      return { ok: true as const, promptId: job.data.promptId };
    },
    { connection, concurrency: 5 },
  );
  worker.on("failed", (job, err) => {
    console.error("[prompt-execution] failed", job?.id, err);
  });
  return worker;
}
