export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { serperCheckRankingBodySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSerperRankingQueue } from "@/lib/queues/serper-ranking.queue";
import { executeSerperRankingJob } from "@/lib/services/serper-ranking-job";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const parsed = await validateBody(req, serperCheckRankingBodySchema, requestId);
  if (!parsed.success) return parsed.response;

  const { brandId, keywords, includeCompetitors, gl, hl } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: brand, error: bErr } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .maybeSingle();
    if (bErr) return serverErrorResponse(bErr.message, requestId);
    if (!brand) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const jobPayload = {
      brandId,
      userId,
      keywords: keywords?.length ? keywords : undefined,
      includeCompetitors,
      gl,
      hl,
      requestId,
    };

    const queue = getSerperRankingQueue();
    if (queue) {
      const job = await queue.add("serper-ranking", jobPayload, {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 2000,
      });
      return Response.json({
        status: "queued" as const,
        jobId: String(job.id),
        requestId,
      });
    }

    const result = await executeSerperRankingJob(jobPayload);
    return Response.json({
      status: "completed" as const,
      jobId: null,
      ...result,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Serper ranking check failed", requestId);
  }
}
