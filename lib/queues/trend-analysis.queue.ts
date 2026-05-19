import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { withQueueDefaults } from "@/lib/redis/bullmq-options";
import { TREND_ANALYSIS_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { TrendAnalysisJobData } from "@/lib/queues/types";

export { TREND_ANALYSIS_QUEUE_NAME };

let queue: Queue<TrendAnalysisJobData> | null | undefined;

export function getTrendAnalysisQueue(): Queue<TrendAnalysisJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection
      ? new Queue(TREND_ANALYSIS_QUEUE_NAME, withQueueDefaults({ connection }))
      : null;
  }
  return queue;
}
