import { Worker } from "bullmq";
import { createBullMQConnection } from "@/lib/redis/client";
import { PROMPT_EXECUTION_QUEUE_NAME } from "@/lib/queues/prompt-execution.queue";
import type { PromptExecutionJobData } from "@/lib/queues/types";

async function main() {
  const connection = createBullMQConnection();
  if (!connection) {
    console.warn("[workers] REDIS_URL / UPSTASH_REDIS_URL not set — workers exiting.");
    process.exit(0);
  }

  if (connection.status === "wait") {
    await connection.connect();
  }

  const worker = new Worker<PromptExecutionJobData>(
    PROMPT_EXECUTION_QUEUE_NAME,
    async (job) => {
      console.log("[prompt-execution] job", job.id, job.data);
      return { ok: true as const, promptId: job.data.promptId };
    },
    { connection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    console.error("[prompt-execution] failed", job?.id, err);
  });

  const shutdown = async () => {
    await worker.close();
    await connection.quit();
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
