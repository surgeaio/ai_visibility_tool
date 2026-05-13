import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { paginationSchema, quickClientBrandSchema } from "@/lib/validators";
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
    return Response.json({ brands: items, data: items, total, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load brands", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  if (isAuthBypassMode()) {
    return Response.json(
      { error: "Not available in demo mode", requestId },
      { status: 400, headers: { "x-request-id": requestId } },
    );
  }

  const bodyValidation = await validateBody(req, quickClientBrandSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401, headers: { "x-request-id": requestId } });
    }

    const { name, domain, website } = bodyValidation.data;
    const brand = await brandsRepo.create({
      name,
      domain,
      website: website ?? null,
      userId: user.id,
    });
    return Response.json({ brand, data: brand, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to create brand", requestId);
  }
}
