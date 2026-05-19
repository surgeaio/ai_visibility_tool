import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { RECOMMENDATION_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { RecommendationJobData } from "@/lib/queues/types";

export { RECOMMENDATION_QUEUE_NAME };

let queue: Queue<RecommendationJobData> | null | undefined;

export function getRecommendationQueue(): Queue<RecommendationJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue(RECOMMENDATION_QUEUE_NAME, withQueueDefaults({ connection }))
      : null;
  }
  return queue;
}
