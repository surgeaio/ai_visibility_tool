export const dynamic = "force-dynamic";

import { notFoundResponse, serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateParams } from "@/lib/api/validate";
import { promptIdParamSchema, updateCompetitorSchema } from "@/lib/validators";
import { CompetitorsRepository } from "@/lib/repositories";

const competitorsRepo = new CompetitorsRepository();

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;
  try {
    const competitor = await competitorsRepo.findById(paramValidation.data.id);
    if (!competitor) return notFoundResponse("Competitor", requestId);
    return Response.json({ competitor, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load competitor", requestId);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;
  const bodyValidation = await validateBody(req, updateCompetitorSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;
  try {
    const competitor = await competitorsRepo.update(paramValidation.data.id, {
      name: bodyValidation.data.name,
    });
    return Response.json({ competitor, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to update competitor", requestId);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;
  try {
    const removed = await competitorsRepo.delete(paramValidation.data.id);
    if (!removed) return notFoundResponse("Competitor", requestId);
    return Response.json({ ok: true, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to delete competitor", requestId);
  }
}
