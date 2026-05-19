export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getBrandQuerySet } from "@/lib/brand-audit/query-sets";
import { BrandAuditRepository } from "@/lib/repositories/brand-audit.repo";
import { brandAuditLlmSchema } from "@/lib/validators/brand-audit.schema";
import { calculateLlmVisibilityScore } from "@/lib/utils/score-calculator";
import { runLlmVisibilityAnalysis } from "@/lib/services/llm-visibility-analyzer";

const repo = new BrandAuditRepository();

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const parsed = await validateBody(req, brandAuditLlmSchema, requestId);
  if (!parsed.success) return parsed.response;

  try {
    const querySet = getBrandQuerySet(parsed.data.brand);
    if (!querySet) {
      return Response.json(
        { error: "Unknown brand. Use shifthub or circle.", requestId },
        { status: 400 },
      );
    }

    const brandDef =
      parsed.data.queries?.length
        ? {
            ...querySet,
            queries: parsed.data.queries.map((text) => ({
              text,
              category: "direct" as const,
            })),
          }
        : querySet;

    const { results, errors } = await runLlmVisibilityAnalysis(brandDef, {
      maxQueries: parsed.data.maxQueries ?? querySet.queries.length,
    });

    const visibilityScore = calculateLlmVisibilityScore(results);
    const userId = await getAuthedUserId();
    const saved = await repo.saveLlmResults(userId, results);

    return Response.json({
      brandName: querySet.brandName,
      brandUrl: parsed.data.url ?? querySet.brandUrl,
      visibilityScore,
      results,
      errors,
      saved,
      requestId,
    });
  } catch (e) {
    console.error(e);
    return serverErrorResponse("LLM visibility analysis failed", requestId);
  }
}
