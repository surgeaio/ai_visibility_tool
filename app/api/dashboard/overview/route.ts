import { isAuthBypassMode } from "@/lib/config";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateQuery } from "@/lib/api/validate";
import { dashboardOverviewQuerySchema } from "@/lib/validators";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BrandsRepository } from "@/lib/repositories/brands.repo";
import {
  buildDemoDashboardOverview,
  getLiveDashboardOverview,
  type DashboardRange,
} from "@/lib/services/dashboard-overview";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const q = validateQuery(req, dashboardOverviewQuerySchema, requestId);
  if (!q.success) return q.response;

  const { brandId, range } = q.data;

  if (isAuthBypassMode()) {
    const brandsRepo = new BrandsRepository();
    const brand = await brandsRepo.findById(brandId);
    const name = brand?.name ?? "Demo brand";
    return Response.json({ ...buildDemoDashboardOverview(name), requestId });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const brandsRepo = new BrandsRepository();
    const brand = await brandsRepo.findById(brandId);
    if (!brand) {
      return Response.json({ error: "Brand not found", requestId }, { status: 404 });
    }
    const payload = await getLiveDashboardOverview(supabase, brandId, brand.name, range as DashboardRange);
    return Response.json({ ...payload, requestId });
  } catch (e) {
    console.error(e);
    return serverErrorResponse(e instanceof Error ? e.message : "Overview failed", requestId);
  }
}
