export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { analyticsQuerySchema } from "@/lib/validators";
import { ResultsRepository } from "@/lib/repositories";

const resultsRepo = new ResultsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, analyticsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;
  const { brandId } = queryValidation.data;
  try {
    const { items, total } = await resultsRepo.findMany({
      pagination: { limit: 50, offset: 0 },
      sortBy: "analyzed_at",
      sortOrder: "desc",
      filters: { brandId },
    });
    return Response.json({ results: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load analysis results", requestId);
  }
}
