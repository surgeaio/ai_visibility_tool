import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import type { PromptExecutionJobData } from "@/lib/queues/types";

export const PROMPT_EXECUTION_QUEUE_NAME = "prompt-execution";

let queue: Queue<PromptExecutionJobData> | null | undefined;

export function getPromptExecutionQueue(): Queue<PromptExecutionJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection ? new Queue(PROMPT_EXECUTION_QUEUE_NAME, { connection }) : null;
  }
  return queue;
}
