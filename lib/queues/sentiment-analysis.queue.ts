import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { SENTIMENT_ANALYSIS_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { SentimentAnalysisJobData } from "@/lib/queues/types";

export { SENTIMENT_ANALYSIS_QUEUE_NAME };

let queue: Queue<SentimentAnalysisJobData> | null | undefined;

export function getSentimentAnalysisQueue(): Queue<SentimentAnalysisJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection ? new Queue(SENTIMENT_ANALYSIS_QUEUE_NAME, { connection }) : null;
  }
  return queue;
}
