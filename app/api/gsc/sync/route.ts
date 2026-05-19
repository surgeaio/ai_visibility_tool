export const dynamic = "force-dynamic";

import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getGscSyncQueue } from "@/lib/queues/gsc-sync.queue";
import { executeGscSyncJob } from "@/lib/services/gsc-sync-job";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const bodySchema = z.object({
  brandId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  daysBack: z.number().int().min(1).max(90).optional(),
});

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Poll BullMQ job status (frontend only hits our API — never Google). */
export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const jobId = new URL(req.url).searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "jobId required", requestId }, { status: 400 });
  }

  const queue = getGscSyncQueue();
  if (!queue) {
    return Response.json({ status: "unknown", error: "Queue unavailable", requestId });
  }

  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      return Response.json({ status: "not_found", requestId });
    }

    const state = await job.getState();
    if (state === "completed") {
      return Response.json({
        status: "completed",
        result: job.returnvalue,
        requestId,
      });
    }
    if (state === "failed") {
      return Response.json({
        status: "failed",
        failedReason: job.failedReason,
        requestId,
      });
    }

    return Response.json({ status: state, requestId });
  } catch (e) {
    console.error("[gsc-sync] job poll failed", e);
    return serverErrorResponse("Failed to read job status", requestId);
  }
}

/**
 * Enqueues GSC sync on Railway workers when Redis is available.
 * Falls back to a fast inline sync on Vercel (no 5000-row sequential loop).
 */
export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const cronAuthed = authorizeCron(req);

  let userId: string | null = null;
  if (!cronAuthed) {
    userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
  }

  let body: z.infer<typeof bodySchema> = {};
  const parsed = await validateBody(req, bodySchema, requestId);
  if (parsed.success) {
    body = parsed.data;
  } else if (!cronAuthed) {
    return parsed.response;
  }

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    return Response.json({ error: "Database not configured", requestId }, { status: 503 });
  }

  if (!body.brandId) {
    return Response.json({ error: "brandId required", requestId }, { status: 400 });
  }

  const { data: connection, error: connErr } = await admin
    .from("gsc_connections")
    .select("id, brand_id, user_id")
    .eq("brand_id", body.brandId)
    .eq("is_active", true)
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connErr) return serverErrorResponse(connErr.message, requestId);
  if (!connection) {
    return Response.json(
      { error: "No active GSC connections", code: "NOT_CONNECTED", requestId },
      { status: 404 },
    );
  }

  if (!cronAuthed && connection.user_id !== userId) {
    return Response.json({ error: "Forbidden", requestId }, { status: 403 });
  }

  const jobPayload = {
    brandId: body.brandId,
    userId: connection.user_id,
    connectionId: connection.id,
    daysBack: body.daysBack ?? 28,
    requestId,
  };

  const queue = getGscSyncQueue();
  if (queue) {
    const job = await queue.add("gsc-sync", jobPayload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 500,
      removeOnFail: 2000,
      jobId: `gsc-${body.brandId}-${Date.now()}`,
    });

    console.info("[gsc-sync] queued", { jobId: job.id, brandId: body.brandId });

    return Response.json({
      status: "queued" as const,
      jobId: String(job.id),
      message: "Sync started on background worker",
      requestId,
    });
  }

  console.warn("[gsc-sync] no Redis — running inline (dev only)");

  try {
    const result = await executeGscSyncJob(jobPayload);
    return Response.json({
      status: "completed" as const,
      results: [{ status: "ok", ...result }],
      requestId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    console.error("[gsc-sync] inline failed:", err);
    return Response.json(
      {
        status: "failed",
        error: message,
        results: [{ connectionId: connection.id, status: "failed", error: message }],
        requestId,
      },
      { status: 500 },
    );
  }
}
