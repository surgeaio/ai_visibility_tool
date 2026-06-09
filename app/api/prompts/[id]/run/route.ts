export const dynamic = "force-dynamic";

import { serverErrorResponse, rateLimitResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { adminHasLlmProviders } from "@/lib/ai/admin-providers";
import { promptIdParamSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { PromptsRepository } from "@/lib/repositories";
import { runSinglePrompt } from "@/lib/services/visibility-orchestrator";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const promptsRepo = new PromptsRepository();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;

  const promptId = paramValidation.data.id;

  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const rl = await rateLimit(`prompt-run:${userId}`);
    if (!rl.ok) {
      return rateLimitResponse(requestId);
    }

    if (!adminHasLlmProviders()) {
      return Response.json(
        {
          error:
            "No LLM providers configured. Admin must set provider API keys in environment variables.",
          code: "NO_PROVIDERS_CONFIGURED",
          requestId,
        },
        { status: 503 },
      );
    }

    const prompt = await promptsRepo.findById(promptId);
    if (!prompt) {
      return Response.json({ error: "Prompt not found", requestId }, { status: 404 });
    }

    const brandId = prompt.brandId;
    const supabase = await createServerSupabaseClient();
    const { data: owned } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!owned) {
      return Response.json({ error: "Brand not found or access denied", requestId }, { status: 404 });
    }

    try {
      const run = await runSinglePrompt({
        brandId,
        promptId,
        triggeredBy: "manual",
        userId,
      });

      const errors = (run.modelErrors ?? []).map((e) => e.error);
      return Response.json({
        status: "completed" as const,
        mode: "sync" as const,
        resultsCount: run.results.length,
        saveStats: run.saveStats,
        modelErrors: run.modelErrors,
        errors,
        requestId,
      });
    } catch (err) {
      console.error("[prompt-run] sync execution failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return Response.json(
        {
          error: "Prompt run failed",
          code: "EXECUTION_ERROR",
          details: message,
          requestId,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[prompt-run]", error);
    return serverErrorResponse("Failed to run prompt", requestId);
  }
}
