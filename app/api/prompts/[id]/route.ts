export const dynamic = "force-dynamic";

import { notFoundResponse, serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateParams } from "@/lib/api/validate";
import { promptIdParamSchema, updatePromptSchema } from "@/lib/validators";
import { PromptsRepository } from "@/lib/repositories";

const promptsRepo = new PromptsRepository();

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;

  try {
    const prompt = await promptsRepo.findById(paramValidation.data.id);
    if (!prompt) return notFoundResponse("Prompt", requestId);
    return Response.json({ prompt, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load prompt", requestId);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;
  const bodyValidation = await validateBody(req, updatePromptSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const updated = await promptsRepo.update(paramValidation.data.id, {
      text: bodyValidation.data.text,
      category: bodyValidation.data.category,
      isActive: bodyValidation.data.isActive,
      tags: bodyValidation.data.tags,
    });
    return Response.json({ prompt: updated, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to update prompt", requestId);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;

  const id = paramValidation.data.id;
  try {
    const deleted = await promptsRepo.delete(id);
    if (!deleted) {
      return notFoundResponse("Prompt", requestId);
    }
    return Response.json({ ok: true, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to delete prompt", requestId);
  }
}
