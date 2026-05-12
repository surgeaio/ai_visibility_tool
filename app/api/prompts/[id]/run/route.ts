import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { promptIdParamSchema } from "@/lib/validators";
import { getPromptExecutionQueue } from "@/lib/queues";
import { PromptsRepository } from "@/lib/repositories";

const promptsRepo = new PromptsRepository();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  const paramValidation = validateParams(params, promptIdParamSchema, requestId);
  if (!paramValidation.success) return paramValidation.response;

  const promptId = paramValidation.data.id;

  try {
    const prompt = await promptsRepo.findById(promptId);
    if (!prompt) {
      return Response.json({ error: "Prompt not found", requestId }, { status: 404 });
    }

    const queue = getPromptExecutionQueue();
    if (queue) {
      const job = await queue.add(
        "run",
        { promptId, requestId },
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
