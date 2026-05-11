import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import { createBrandSchema, paginationSchema } from "@/lib/validators";
import { BrandsRepository } from "@/lib/repositories";

const brandsRepo = new BrandsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, paginationSchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const { limit, offset } = queryValidation.data;
  try {
    const { items, total } = await brandsRepo.findMany({
      pagination: { limit, offset },
      sortBy: "created_at",
      sortOrder: "desc",
    });
    return Response.json({ brands: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load brands", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const bodyValidation = await validateBody(req, createBrandSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;
  try {
    const brand = await brandsRepo.create({
      name: bodyValidation.data.name,
      website: bodyValidation.data.website,
      category: bodyValidation.data.industry,
    });
    return Response.json({ brand, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to create brand", requestId);
  }
}
