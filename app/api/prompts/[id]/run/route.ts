import { serverErrorResponse, rateLimitResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { promptIdParamSchema } from "@/lib/validators";
import { getPromptExecutionQueue } from "@/lib/queues";
import { rateLimit } from "@/lib/rate-limit";
import { PromptsRepository } from "@/lib/repositories";
import { UserApiKeysRepository } from "@/lib/repositories/user-api-keys.repo";

const promptsRepo = new PromptsRepository();
const userApiKeysRepo = new UserApiKeysRepository();

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

    const hasKeys = await userApiKeysRepo.hasAnyActiveLlmKey(userId);
    if (!hasKeys) {
      return Response.json(
        {
          error: "No API keys configured. Add at least one LLM provider key.",
          action: "add_api_key",
          url: "/dashboard/settings/api-keys",
          requestId,
        },
        { status: 400 },
      );
    }

    const prompt = await promptsRepo.findById(promptId);
    if (!prompt) {
      return Response.json({ error: "Prompt not found", requestId }, { status: 404 });
    }

    const queue = getPromptExecutionQueue();
    if (queue) {
      const job = await queue.add(
        "run",
        { promptId, userId, brandId: prompt.brandId, requestId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
      return Response.json({
        jobId: String(job.id),
        status: "queued" as const,
        requestId,
      });
    }

    return Response.json({
      jobId: `local-${promptId}`,
      status: "queued" as const,
      note: "Redis not configured; job not persisted to BullMQ.",
      requestId,
    });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to enqueue prompt run", requestId);
  }
}
