import { Queue } from "bullmq";
import { NextResponse } from "next/server";
import { BULL_QUEUE_NAMES } from "@/lib/queues/queue-names";
import { createBullMQConnection } from "@/lib/redis/client";

export async function GET() {
  const base = createBullMQConnection();
  if (!base) {
    return NextResponse.json({
      status: "degraded",
      redis: false,
      queues: null,
      message: "Redis URL not configured",
    });
  }

  try {
    if (base.status === "wait") {
      await base.connect();
    }

    const queues: Record<string, Awaited<ReturnType<Queue["getJobCounts"]>>> = {};

    for (const name of BULL_QUEUE_NAMES) {
      const conn = base.duplicate();
      if (conn.status === "wait") {
        await conn.connect();
      }
      const q = new Queue(name, { connection: conn });
      queues[name] = await q.getJobCounts();
      await q.close();
      await conn.quit();
    }

    await base.quit();

    return NextResponse.json({
      status: "ok",
      redis: true,
      queues,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 503 });
  }
}
