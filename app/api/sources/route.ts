/**
 * GET /api/sources?brandId=&range=
 *
 * Returns citation domains grouped by mention count for the given brand,
 * aggregated from the `citations` table.
 *
 * Response:
 *   [
 *     { domain: "g2.com", mentions: 4, urls: [...], lastSeen: "2026-05-19T..." },
 *     ...
 *   ]
 */
export const dynamic = "force-dynamic";

import { z } from "zod";
import { getRequestId } from "@/lib/api/validate";
import { serverErrorResponse } from "@/lib/api/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureCitationsExist } from "@/lib/services/demo-data-seeder";

const querySchema = z.object({
  brandId: z.string().min(1),
  range: z
    .string()
    .optional()
    .transform((v) => {
      const n = parseInt(v ?? "30", 10);
      return isNaN(n) ? 30 : n;
    }),
});

export interface SourceRow {
  domain: string;
  mentions: number;
  urls: string[];
  lastSeen: string | null;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const { searchParams } = new URL(req.url);

  const parsed = querySchema.safeParse({
    brandId: searchParams.get("brandId") ?? undefined,
    range: searchParams.get("range") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "brandId is required", details: parsed.error.flatten(), requestId },
      { status: 400 },
    );
  }

  const { brandId, range } = parsed.data;

  // Auto-seed citations for known demo brands if missing
  await ensureCitationsExist(brandId).catch(() => undefined);

  try {
    const supabase = createAdminSupabaseClient();

    const cutoff = new Date(Date.now() - range * 86400_000).toISOString();

    const { data, error } = await supabase
      .from("citations")
      .select("domain, url, created_at")
      .eq("brand_id", brandId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Aggregate by domain in JS (Supabase JS client has no GROUP BY)
    const domainMap = new Map<string, { urls: string[]; lastSeen: string }>();
    for (const row of data ?? []) {
      const d = row.domain as string;
      const u = row.url as string;
      const ts = row.created_at as string;
      const existing = domainMap.get(d);
      if (existing) {
        existing.urls.push(u);
        if (ts > existing.lastSeen) existing.lastSeen = ts;
      } else {
        domainMap.set(d, { urls: [u], lastSeen: ts });
      }
    }

    const sources: SourceRow[] = [...domainMap.entries()]
      .map(([domain, { urls, lastSeen }]) => ({
        domain,
        mentions: urls.length,
        urls: [...new Set(urls)],
        lastSeen,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    return Response.json({ sources, total: sources.length, requestId });
  } catch (error) {
    console.error("[/api/sources GET]", error);
    return serverErrorResponse("Failed to load sources", requestId);
  }
}
