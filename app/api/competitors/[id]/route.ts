export const dynamic = "force-dynamic";

import { notFoundResponse, serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody, validateParams } from "@/lib/api/validate";
import { promptIdParamSchema, updateCompetitorSchema, uuidSchema } from "@/lib/validators";
import { CompetitorsRepository } from "@/lib/repositories";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const competitorsRepo = new CompetitorsRepository();

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;

  const brandId = new URL(req.url).searchParams.get("brandId");
  if (!brandId) {
    return Response.json({ error: "brandId is required", requestId }, { status: 400 });
  }

  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const competitor = await competitorsRepo.findById(paramValidation.data.id, brandId);
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

  const brandId = new URL(req.url).searchParams.get("brandId");
  if (!brandId) {
    return Response.json({ error: "brandId is required", requestId }, { status: 400 });
  }

  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const competitor = await competitorsRepo.update(
      paramValidation.data.id,
      {
        name: bodyValidation.data.name,
        domain: bodyValidation.data.domain,
      },
      brandId,
    );
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

  const brandIdRaw = new URL(req.url).searchParams.get("brandId");
  const brandParsed = uuidSchema.safeParse(brandIdRaw);
  if (!brandParsed.success) {
    return Response.json({ error: "brandId is required", requestId }, { status: 400 });
  }
  const brandId = brandParsed.data;

  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const removed = await competitorsRepo.delete(paramValidation.data.id, brandId);
    if (!removed) return notFoundResponse("Competitor", requestId);
    return Response.json({ ok: true, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to delete competitor", requestId);
  }
}
