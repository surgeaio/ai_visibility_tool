import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getPromptExecutionQueue } from "@/lib/queues";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

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

function computeNextRunAt(frequency: string | null | undefined): string {
  const f = (frequency ?? "daily").toLowerCase();
  const now = Date.now();
  if (f.includes("hour")) return new Date(now + 3600_000).toISOString();
  if (f.includes("week")) return new Date(now + 7 * 86400_000).toISOString();
  return new Date(now + 86400_000).toISOString();
}

function isDue(row: {
  next_run_at: string | null;
  frequency: string;
  is_paused: boolean | null;
}): boolean {
  if (row.is_paused) return false;
  const f = row.frequency?.toLowerCase() ?? "manual";
  if (f === "manual") return false;
  if (!row.next_run_at) return true;
  return new Date(row.next_run_at).getTime() <= Date.now();
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = getPromptExecutionQueue();
  const admin = tryCreateAdminSupabaseClient();

  if (!admin) {
    return NextResponse.json({
      ok: false,
      enqueued: 0,
      queueAvailable: Boolean(queue),
      message: "SUPABASE_SERVICE_ROLE_KEY missing — cannot read prompt_schedules.",
    });
  }

  if (!queue) {
    return NextResponse.json({
      ok: true,
      enqueued: 0,
      queueAvailable: false,
      message: "Redis not configured — set REDIS_URL or Upstash and run workers.",
    });
  }

  const { data: schedules, error: sErr } = await admin
    .from("prompt_schedules")
    .select("id, prompt_id, brand_id, next_run_at, frequency, is_paused")
    .eq("is_paused", false);

  if (sErr) {
    return NextResponse.json({ ok: false, error: sErr.message, enqueued: 0 }, { status: 500 });
  }

  const rows = schedules ?? [];
  const due = rows.filter((r) => isDue(r));

  const promptIds = [...new Set(due.map((d) => d.prompt_id))];
  if (!promptIds.length) {
    return NextResponse.json({
      ok: true,
      enqueued: 0,
      scanned: rows.length,
      due: 0,
      queueAvailable: true,
      message: "No due schedules.",
    });
  }

  const { data: prompts, error: pErr } = await admin
    .from("prompts")
    .select("id, brand_id, is_active")
    .in("id", promptIds);
  if (pErr) {
    return NextResponse.json({ ok: false, error: pErr.message, enqueued: 0 }, { status: 500 });
  }

  const activePrompts = new Map((prompts ?? []).filter((p) => p.is_active).map((p) => [p.id, p]));

  const brandIds = [...new Set(due.map((d) => d.brand_id))];
  const { data: brands, error: bErr } = await admin.from("brands").select("id, user_id").in("id", brandIds);
  if (bErr) {
    return NextResponse.json({ ok: false, error: bErr.message, enqueued: 0 }, { status: 500 });
  }
  const userByBrand = new Map((brands ?? []).map((b) => [b.id, b.user_id]));

  let enqueued = 0;
  const errors: string[] = [];

  for (const sch of due) {
    const prompt = activePrompts.get(sch.prompt_id);
    if (!prompt) continue;
    const userId = userByBrand.get(sch.brand_id);
    if (!userId) {
      errors.push(`missing_user:${sch.brand_id}`);
      continue;
    }
    try {
      const job = await queue.add(
        "cron-run",
        {
          promptId: sch.prompt_id,
          userId,
          brandId: sch.brand_id,
          requestId: `cron-${sch.id}`,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
      if (job.id != null) enqueued += 1;

      await admin
        .from("prompt_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: computeNextRunAt(sch.frequency),
          last_run_status: "queued",
        })
        .eq("id", sch.id);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "enqueue_failed");
    }
  }

  return NextResponse.json({
    ok: true,
    enqueued,
    scanned: rows.length,
    due: due.length,
    queueAvailable: true,
    errors: errors.length ? errors : undefined,
  });
}

export async function POST(req: Request) {
  return GET(req);
}
