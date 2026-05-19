import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { VISIBILITY_RUN_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { VisibilityRunJobData } from "@/lib/queues/types";

export { VISIBILITY_RUN_QUEUE_NAME };

let queue: Queue<VisibilityRunJobData> | null | undefined;

export function getVisibilityRunQueue(): Queue<VisibilityRunJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue<VisibilityRunJobData>(
          VISIBILITY_RUN_QUEUE_NAME,
          withQueueDefaults({ connection }),
        )
      : null;
  }
  return queue;
}
