import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getWebsiteCrawlQueue } from "@/lib/queues/website-crawl.queue";
import { BrandsRepository } from "@/lib/repositories";

const bodySchema = z.object({
  brandId: z.string().min(1),
  siteUrl: z.string().url().optional(),
  maxPages: z.coerce.number().int().min(1).max(100).optional().default(25),
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
    const brand = await brandsRepo.findById(parsed.data.brandId);
    const siteUrl = parsed.data.siteUrl ?? brand?.website;
    if (!siteUrl) {
      return Response.json(
        { error: "siteUrl required (or set brand website)", requestId },
        { status: 400 },
      );
    }

    const queue = getWebsiteCrawlQueue();
    if (queue) {
      const job = await queue.add(
        "crawl",
        {
          brandId: parsed.data.brandId,
          siteUrl,
          maxPages: parsed.data.maxPages,
        },
        { attempts: 1, removeOnComplete: 200 },
      );
      return Response.json({ jobId: String(job.id), status: "queued", requestId });
    }

    return Response.json({
      jobId: null,
      status: "skipped",
      note: "Redis not configured.",
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to enqueue crawl", requestId);
  }
}
