import type IORedis from "ioredis";
import { createBullMQConnection } from "@/lib/redis/client";
import { registerCitationWorker } from "./citation.worker";
import { registerPromptExecutionWorker } from "./prompt.worker";
import { registerRecommendationWorker } from "./recommendation.worker";
import { registerSentimentAnalysisWorker } from "./sentiment.worker";
import { registerTrendWorker } from "./trend.worker";

async function duplicateConnection(parent: IORedis): Promise<IORedis> {
  const child = parent.duplicate();
  if (child.status === "wait") {
    await child.connect();
  }
  return child;
}

async function main() {
  const base = createBullMQConnection();
  if (!base) {
    console.warn("[workers] REDIS_URL / UPSTASH_REDIS_URL not set — workers exiting.");
    process.exit(0);
  }

  if (base.status === "wait") {
    await base.connect();
  }

  const childConnections: IORedis[] = [];
  const dup = async (parent: IORedis) => {
    const c = await duplicateConnection(parent);
    childConnections.push(c);
    return c;
  };

  const workers = [
    registerPromptExecutionWorker(base),
    registerSentimentAnalysisWorker(await dup(base)),
    registerRecommendationWorker(await dup(base)),
    registerCitationWorker(await dup(base)),
    registerTrendWorker(await dup(base)),
  ];

  const shutdown = async () => {
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all(childConnections.map((c) => c.quit().catch(() => undefined)));
    await base.quit().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
