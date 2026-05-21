export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody, validateQuery } from "@/lib/api/validate";
import {
  createCompetitorApiSchema,
  deleteCompetitorQuerySchema,
  listCompetitorsQuerySchema,
} from "@/lib/validators";
import { CompetitorsRepository } from "@/lib/repositories";
import { metricsForCompetitor } from "@/lib/services/competitor-metrics";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureBrandHasDemoData } from "@/lib/services/demo-data-seeder";

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

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, listCompetitorsQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", competitors: [], requestId }, { status: 401 });
  }

  const { brandId, search, limit, offset, sortBy, sortOrder } = queryValidation.data;

  try {
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", competitors: [], requestId }, { status: 404 });
    }

    // Auto-seed demo data (non-blocking — fetches brand name from DB internally)
    await ensureBrandHasDemoData(brandId).catch(() => undefined);

    const { items, total } = await competitorsRepo.findMany({
      search,
      sortBy,
      sortOrder,
      pagination: { limit, offset },
      filters: { brandId },
    });

    const admin = tryCreateAdminSupabaseClient();
    let analyses: Array<{ all_brands_mentioned: unknown }> = [];
    if (admin) {
      const { data } = await admin
        .from("chat_analysis")
        .select("all_brands_mentioned")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .limit(200);
      analyses = data ?? [];
    }

    const competitors = items.map((comp) => {
      const metrics = metricsForCompetitor(comp.name, analyses);
      return {
        ...comp,
        visibility: metrics.visibility,
        sentiment: metrics.sentiment,
        position: metrics.position,
      };
    });

    return Response.json({ competitors, total, requestId });
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
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { brandId, name, domain } = bodyValidation.data;
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const created = await competitorsRepo.create({ name, brandId, domain });
    return Response.json({ competitor: created, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to create competitor", requestId);
  }
}

export async function DELETE(req: Request) {
  const requestId = getRequestId(req);
  const queryValidation = validateQuery(req, deleteCompetitorQuerySchema, requestId);
  if (!queryValidation.success) return queryValidation.response;

  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const { id, brandId } = queryValidation.data;
    const allowed = await verifyBrandForUser(brandId, userId);
    if (!allowed) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }

    const removed = await competitorsRepo.delete(id, brandId);
    if (!removed) {
      return Response.json({ error: "Competitor not found", requestId }, { status: 404 });
    }
    return Response.json({ success: true, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to delete competitor", requestId);
  }
}
