export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import { createPromptApiSchema, listPromptsQuerySchema } from "@/lib/validators";
import { PromptsRepository } from "@/lib/repositories";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const promptsRepo = new PromptsRepository();

async function verifyBrandForUser(brandId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listPromptsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", prompts: [], requestId }, { status: 401 });
  }

  const { brandId, search, category, limit, offset, sortBy, sortOrder } = queryValidation.data;

  try {
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", prompts: [], requestId }, { status: 404 });
    }

    const { items, total } = await promptsRepo.findMany({
      search,
      sortBy,
      sortOrder,
      pagination: { limit, offset },
      filters: { brandId, category },
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
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { text, category, brandId } = bodyValidation.data;
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const created = await promptsRepo.create({ text, category, brandId, userId });
    return Response.json({ ...created, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to create prompt", requestId);
  }
}
