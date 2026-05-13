import { Queue } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { WEBSITE_CRAWL_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { WebsiteCrawlJobData } from "@/lib/queues/types";

export { WEBSITE_CRAWL_QUEUE_NAME };

let queue: Queue<WebsiteCrawlJobData> | null | undefined;

export function getWebsiteCrawlQueue(): Queue<WebsiteCrawlJobData> | null {
  if (queue === undefined) {
    const connection = createBullMQConnection();
    queue = connection ? new Queue(WEBSITE_CRAWL_QUEUE_NAME, { connection }) : null;
  }
  return queue;
}
