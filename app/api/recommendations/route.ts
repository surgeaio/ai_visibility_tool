import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import {
  listRecommendationsQuerySchema,
  updateRecommendationStatusSchema,
} from "@/lib/validators";
import { RecommendationsRepository } from "@/lib/repositories";

const recommendationsRepo = new RecommendationsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listRecommendationsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const { status, priority, category, search, limit, offset, sortBy, sortOrder, brandId } =
    queryValidation.data;

  try {
    const { items, total } = await recommendationsRepo.findMany({
      search,
      sortBy,
      sortOrder,
      pagination: { limit, offset },
      filters: { status, priority, category, ...(brandId ? { brandId } : {}) },
    });
    return Response.json({ recommendations: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load recommendations", requestId);
  }
}

async function updateStatus(req: Request, requestId: string) {
  const bodyValidation = await validateBody(req, updateRecommendationStatusSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const { id, status } = bodyValidation.data;
    const updated = await recommendationsRepo.update(id, { status });
    return Response.json({ ok: true, recommendation: updated, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to update recommendation", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  return updateStatus(req, requestId);
}

export async function PATCH(req: Request) {
  const requestId = getRequestId(req);
  return updateStatus(req, requestId);
}
