import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { SERPER_RANKING_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { SerperRankingJobData } from "@/lib/queues/types";

export { SERPER_RANKING_QUEUE_NAME };

let queue: Queue<SerperRankingJobData> | null | undefined;

export function getSerperRankingQueue(): Queue<SerperRankingJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue(SERPER_RANKING_QUEUE_NAME, withQueueDefaults({ connection }))
      : null;
  }
  return queue;
}
