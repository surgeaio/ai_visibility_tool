import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { PLATFORM_SCHEDULER_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { PlatformSchedulerJobName } from "@/lib/queues/types";

export { PLATFORM_SCHEDULER_QUEUE_NAME };

let queue: Queue<unknown, unknown, PlatformSchedulerJobName> | null | undefined;

export function getPlatformSchedulerQueue(): Queue<
  unknown,
  unknown,
  PlatformSchedulerJobName
> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue<unknown, unknown, PlatformSchedulerJobName>(
          PLATFORM_SCHEDULER_QUEUE_NAME,
          withQueueDefaults({ connection }),
        )
      : null;
  }
  return queue;
}
