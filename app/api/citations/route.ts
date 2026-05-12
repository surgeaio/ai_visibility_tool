import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { listCitationsQuerySchema } from "@/lib/validators";
import { CitationsRepository } from "@/lib/repositories";

const citationsRepo = new CitationsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listCitationsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const { limit, offset, brandId } = queryValidation.data;

  try {
    const { items, total } = await citationsRepo.findMany({
      pagination: { limit, offset },
      filters: brandId ? { brandId } : undefined,
    });
    return Response.json({ citations: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load citations", requestId);
  }
}
