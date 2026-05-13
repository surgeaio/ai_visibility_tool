import { z } from "zod";
import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEMO_NON_INDEXED_PAGES } from "@/lib/demo/seed-data";

const schema = z.object({
  brandId: z.string().min(1),
  indexed: z.enum(["true", "false"]).optional(),
});

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, schema, requestId);
  if (!q.success) return q.response;

  const wantIndexed = q.data.indexed === "true" ? true : q.data.indexed === "false" ? false : undefined;

  if (isAuthBypassMode()) {
    const pages = DEMO_NON_INDEXED_PAGES.map((p) => ({
      url: p.url,
      isIndexed: false,
      coverageState: p.reason,
      indexingIssue: p.hint,
    }));
    return Response.json({ source: "demo" as const, pages, requestId });
  }

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("indexed_pages").select("*").eq("brand_id", q.data.brandId);
    if (wantIndexed !== undefined) {
      query = query.eq("is_indexed", wantIndexed);
    }
    const { data, error } = await query.order("checked_at", { ascending: false }).limit(500);
    if (error) return serverErrorResponse(error.message, requestId);
    return Response.json({
      source: "live" as const,
      pages: (data ?? []).map((r) => ({
        url: r.url,
        isIndexed: r.is_indexed,
        coverageState: r.coverage_state,
        indexingIssue: r.indexing_issue,
      })),
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Failed to load indexed pages", requestId);
  }
}
