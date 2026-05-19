export const dynamic = "force-dynamic";

import { serverErrorResponse, rateLimitResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { adminHasLlmProviders } from "@/lib/ai/admin-providers";
import { promptIdParamSchema } from "@/lib/validators";
import { getPromptExecutionQueue } from "@/lib/queues";
import { rateLimit } from "@/lib/rate-limit";
import { isRedisAvailable } from "@/lib/redis/client";
import { PromptsRepository } from "@/lib/repositories";
import { executePromptExecutionJob } from "@/lib/services/llm-tracker";

export const maxDuration = 60;

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
    const jobPayload = { promptId, userId, brandId, requestId };

    if (isRedisAvailable()) {
      try {
        const queue = getPromptExecutionQueue();
        if (queue) {
          const job = await queue.add("run", jobPayload, {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
          });
          return Response.json({
            jobId: String(job.id),
            status: "queued" as const,
            mode: "async" as const,
            requestId,
          });
        }
      } catch (err) {
        console.warn("[prompt-run] queue failed, falling back to sync:", (err as Error).message);
      }
    }

    try {
      const { results, errors } = await executePromptExecutionJob(jobPayload);
      return Response.json({
        status: "completed" as const,
        mode: "sync" as const,
        resultsCount: results.length,
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
    return serverErrorResponse("Failed to enqueue prompt run", requestId);
  }
}
