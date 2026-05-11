import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import { createPromptApiSchema, listPromptsQuerySchema } from "@/lib/validators";
import { PromptsRepository } from "@/lib/repositories";

const promptsRepo = new PromptsRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listPromptsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const { search, category, limit, offset, sortBy, sortOrder } = queryValidation.data;
  try {
    const { items, total } = await promptsRepo.findMany({
      search,
      sortBy,
      sortOrder,
      pagination: { limit, offset },
      filters: { category },
    });
    return Response.json({ prompts: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load prompts", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const bodyValidation = await validateBody(req, createPromptApiSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const { text, category } = bodyValidation.data;
    const created = await promptsRepo.create({ text, category });
    return Response.json({ ...created, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to create prompt", requestId);
  }
}
