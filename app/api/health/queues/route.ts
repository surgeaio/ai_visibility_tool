import { Queue } from "bullmq";
import { NextResponse } from "next/server";
import { PROMPT_EXECUTION_QUEUE_NAME } from "@/lib/queues/prompt-execution.queue";
import { createBullMQConnection } from "@/lib/redis/client";

export async function GET() {
  const connection = createBullMQConnection();
  if (!connection) {
    return NextResponse.json({
      status: "degraded",
      redis: false,
      queues: null,
      message: "Redis URL not configured",
    });
  }

  try {
    if (connection.status === "wait") {
      await connection.connect();
    }
    const q = new Queue(PROMPT_EXECUTION_QUEUE_NAME, { connection });
    const counts = await q.getJobCounts();
    await q.close();
    await connection.quit();
    return NextResponse.json({
      status: "ok",
      redis: true,
      queues: {
        [PROMPT_EXECUTION_QUEUE_NAME]: counts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 503 });
  }
}
