import { notFoundResponse, serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateParams } from "@/lib/api/validate";
import { promptIdParamSchema, updateBrandSchema } from "@/lib/validators";
import { BrandsRepository } from "@/lib/repositories";

const brandsRepo = new BrandsRepository();

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;
  try {
    const brand = await brandsRepo.findById(paramValidation.data.id);
    if (!brand) return notFoundResponse("Brand", requestId);
    return Response.json({ brand, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load brand", requestId);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;
  const bodyValidation = await validateBody(req, updateBrandSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;
  try {
    const brand = await brandsRepo.update(paramValidation.data.id, {
      name: bodyValidation.data.name,
      website: bodyValidation.data.website,
      category: bodyValidation.data.industry,
    });
    return Response.json({ brand, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to update brand", requestId);
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
    const ok = await brandsRepo.delete(paramValidation.data.id);
    if (!ok) return notFoundResponse("Brand", requestId);
    return Response.json({ ok: true, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to delete brand", requestId);
  }
}
