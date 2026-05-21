export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { listCitationsQuerySchema } from "@/lib/validators";
import { CitationsRepository } from "@/lib/repositories";
import { ensureBrandHasDemoData } from "@/lib/services/demo-data-seeder";

const citationsRepo = new CitationsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listCitationsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const { limit, offset, brandId } = queryValidation.data;

  // Auto-seed demo data when brand has no citations yet (non-blocking)
  if (brandId) {
    await ensureBrandHasDemoData(brandId).catch(() => undefined);
  }

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
