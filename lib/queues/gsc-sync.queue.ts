import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { GSC_SYNC_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { GscSyncJobData } from "@/lib/queues/types";

let queue: Queue<GscSyncJobData> | null | undefined;

export function getGscSyncQueue(): Queue<GscSyncJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue<GscSyncJobData>(GSC_SYNC_QUEUE_NAME, withQueueDefaults({ connection }))
      : null;
  }
  return queue;
}
