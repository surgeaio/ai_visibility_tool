export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import {
  createCompetitorApiSchema,
  listCompetitorsQuerySchema,
} from "@/lib/validators";
import { CompetitorsRepository } from "@/lib/repositories";

const competitorsRepo = new CompetitorsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listCompetitorsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const { search, limit, offset, sortBy, sortOrder } = queryValidation.data;
  try {
    const { items, total } = await competitorsRepo.findMany({
      search,
      sortBy,
      sortOrder,
      pagination: { limit, offset },
    });
    return Response.json({ competitors: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load competitors", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const bodyValidation = await validateBody(req, createCompetitorApiSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const { name } = bodyValidation.data;
    const created = await competitorsRepo.create({ name });
    return Response.json({ ...created, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to create competitor", requestId);
  }
}
