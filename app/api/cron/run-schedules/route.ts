import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runDuePromptSchedules } from "@/lib/services/prompt-schedule-runner";

function isAuthorizedCron(req: Request): boolean {
  const secret = getEnv().CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-cron-secret");
  return header === secret;
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDuePromptSchedules();
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}

export async function POST(req: Request) {
  return GET(req);
}
