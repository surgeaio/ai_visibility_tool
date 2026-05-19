import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { withWorkerSettings } from "@/lib/redis/bullmq-options";
import { PROMPT_EXECUTION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { PromptExecutionJobData } from "@/lib/queues/types";
import { executePromptExecutionJob } from "@/lib/services/llm-tracker";

export function registerPromptExecutionWorker(connection: IORedis) {
  const worker = new Worker<PromptExecutionJobData>(
    PROMPT_EXECUTION_QUEUE_NAME,
    async (job) => {
      const { results, errors } = await executePromptExecutionJob(job.data);
      console.log("[prompt-execution]", job.id, {
        promptId: job.data.promptId,
        ok: results.length,
        errors,
      });
      return { ok: true as const, promptId: job.data.promptId, resultsCount: results.length, errors };
    },
    withWorkerSettings({ connection, concurrency: 2 }),
  );
  worker.on("failed", (job, err) => {
    console.error("[prompt-execution] failed", job?.id, err);
  });
  return worker;
}
