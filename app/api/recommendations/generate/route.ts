import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getRecommendationQueue } from "@/lib/queues/recommendation.queue";
import { BrandsRepository } from "@/lib/repositories";

const bodySchema = z.object({
  brandId: z.string().min(1),
  brandName: z.string().min(1).optional(),
});

const brandsRepo = new BrandsRepository();

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const parsed = await validateBody(req, bodySchema, requestId);
  if (!parsed.success) return parsed.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  try {
    let brandName = parsed.data.brandName;
    if (!brandName) {
      const b = await brandsRepo.findById(parsed.data.brandId);
      brandName = b?.name;
    }

    const queue = getRecommendationQueue();
    if (queue) {
      const job = await queue.add(
        "generate",
        {
          brandId: parsed.data.brandId,
          userId,
          brandName: brandName ?? undefined,
        },
        { attempts: 2, removeOnComplete: 500 },
      );
      return Response.json({ jobId: String(job.id), status: "queued", requestId });
    }

    return Response.json({
      jobId: null,
      status: "skipped",
      note: "Redis not configured; enqueue from a worker-enabled environment.",
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to enqueue recommendations", requestId);
  }
}
