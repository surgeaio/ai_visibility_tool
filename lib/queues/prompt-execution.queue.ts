import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { PROMPT_EXECUTION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { PromptExecutionJobData } from "@/lib/queues/types";

export { PROMPT_EXECUTION_QUEUE_NAME };

let queue: Queue<PromptExecutionJobData> | null | undefined;

export function getPromptExecutionQueue(): Queue<PromptExecutionJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue(PROMPT_EXECUTION_QUEUE_NAME, withQueueDefaults({ connection }))
      : null;
  }
  return queue;
}
