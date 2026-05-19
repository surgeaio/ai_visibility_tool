export const dynamic = "force-dynamic";

import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getWebsiteCrawlQueue } from "@/lib/queues/website-crawl.queue";
import { isRedisAvailable } from "@/lib/redis/client";
import { BrandsRepository } from "@/lib/repositories";
import { normalizeSiteUrl, runWebsiteAuditSync } from "@/lib/services/website-audit-runner";

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
    if (!brand) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    let siteUrl: string;
    try {
      siteUrl = parsed.data.siteUrl
        ? normalizeSiteUrl(parsed.data.siteUrl)
        : brand.website
          ? normalizeSiteUrl(brand.website)
          : (() => {
              throw new Error(
                `Brand "${brand.name}" has no website set. Add a website in brand settings or Supabase brands.website.`,
              );
            })();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json({ error: message, code: "INVALID_SITE_URL", requestId }, { status: 400 });
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

    const result = await runWebsiteAuditSync({ brandId, siteUrl, maxPages });
    return Response.json({
      status: "completed",
      mode: "sync",
      ...result,
      requestId,
    });
  } catch (e) {
    console.error("[website-audit] run failed:", e);
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      {
        error: message,
        code: "AUDIT_ERROR",
        details: process.env.NODE_ENV === "development" ? message : undefined,
        requestId,
      },
      { status: 500 },
    );
  }
}
