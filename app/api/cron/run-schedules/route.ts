import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getPromptExecutionQueue } from "@/lib/queues";

function isAuthorizedCron(req: Request): boolean {
  if (process.env.VERCEL === "1" && req.headers.get("x-vercel-cron") === "1") {
    return true;
  }
  const secret = getEnv().CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-cron-secret");
  return header === secret;
}

/**
 * Vercel Cron / external scheduler: enqueue due prompt runs (stub until Sprint D full wiring).
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = getPromptExecutionQueue();
  const enqueued = 0;

  return NextResponse.json({
    ok: true,
    enqueued,
    queueAvailable: Boolean(queue),
    message: "Schedule scan stub — Sprint D will read prompt_schedules and enqueue jobs.",
  });
}

export async function POST(req: Request) {
  return GET(req);
}
