import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { loadGoogleRankingsForBrand } from "@/lib/services/google-rankings-data";
import { googleRankingsQuerySchema } from "@/lib/validators/google-rankings.schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, googleRankingsQuerySchema, requestId);
  if (!q.success) return q.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const { brandId, range, queriesPage, pagesPage, page23Page, pageSize } = q.data;

  try {
    const result = await loadGoogleRankingsForBrand({
      userId,
      brandId,
      range,
      queriesPage,
      pagesPage,
      page23Page,
      pageSize,
    });

    if ("error" in result && result.error === "FORBIDDEN") {
      return Response.json({ error: "Brand not found", requestId }, { status: 403 });
    }

    return Response.json({ ...result, source: "live" as const, requestId });
  } catch (e) {
    console.error("[google-rankings]", e);
    return serverErrorResponse("Failed to load Google rankings", requestId);
  }
}
