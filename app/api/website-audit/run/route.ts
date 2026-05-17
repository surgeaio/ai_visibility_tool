import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getWebsiteCrawlQueue } from "@/lib/queues/website-crawl.queue";
import { isRedisAvailable } from "@/lib/redis/client";
import { BrandsRepository } from "@/lib/repositories";
import { runWebsiteAuditSync } from "@/lib/services/website-audit-runner";

export const maxDuration = 60;

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

    const { brandId, maxPages } = parsed.data;
    const jobData = { brandId, siteUrl, maxPages };

    if (isRedisAvailable()) {
      try {
        const queue = getWebsiteCrawlQueue();
        if (queue) {
          const job = await queue.add("crawl", jobData, { attempts: 1, removeOnComplete: 200 });
          return Response.json({
            jobId: String(job.id),
            status: "queued",
            mode: "async",
            requestId,
          });
        }
      } catch (err) {
        console.warn("[website-audit] queue failed, falling back to sync:", (err as Error).message);
      }
    }

    try {
      const result = await runWebsiteAuditSync({ brandId, siteUrl, maxPages });
      return Response.json({
        status: "completed",
        mode: "sync",
        ...result,
        requestId,
      });
    } catch (err) {
      console.error("[website-audit] sync crawl failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return Response.json(
        {
          error: "Website audit failed",
          code: "AUDIT_ERROR",
          details: message,
          requestId,
        },
        { status: 500 },
      );
    }
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to enqueue crawl", requestId);
  }
}
