import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { brandAuditFullReportSchema } from "@/lib/validators/brand-audit.schema";
import { buildFullBrandReport } from "@/lib/services/brand-audit-service";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const parsed = await validateBody(req, brandAuditFullReportSchema, requestId);
  if (!parsed.success) return parsed.response;

  try {
    const userId = await getAuthedUserId();
    const report = await buildFullBrandReport({
      brand: parsed.data.brand,
      url: parsed.data.url,
      userId,
      runLlm: parsed.data.runLlm,
      maxLlmQueries: parsed.data.maxLlmQueries,
    });

    return Response.json({ ...report, requestId });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("Full brand audit failed", requestId);
  }
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const brand = new URL(req.url).searchParams.get("brand");
  if (!brand) {
    return Response.json({ error: "brand query required", requestId }, { status: 400 });
  }
  const { getCachedOrSampleReport } = await import("@/lib/services/brand-audit-service");
  const report = await getCachedOrSampleReport(brand);
  return Response.json({ report, requestId });
}
