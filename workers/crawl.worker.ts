import type IORedis from "ioredis";
import { Worker } from "bullmq";
import { withWorkerSettings } from "@/lib/redis/bullmq-options";
import { WEBSITE_CRAWL_QUEUE_NAME } from "@/lib/queues/queue-names";
import type { WebsiteCrawlJobData } from "@/lib/queues/types";
import { runWebsiteAuditSync } from "@/lib/services/website-audit-runner";

export function registerWebsiteCrawlWorker(connection: IORedis) {
  return new Worker<WebsiteCrawlJobData>(
    WEBSITE_CRAWL_QUEUE_NAME,
    async (job) => {
      const { brandId, siteUrl, maxPages } = job.data;
      const result = await runWebsiteAuditSync({ brandId, siteUrl, maxPages });
      return { ok: true as const, ...result };
    },
    withWorkerSettings({ connection, concurrency: 1 }),
  );
}
