export const dynamic = "force-dynamic";

import { z } from "zod";
import { adminHasLlmProviders } from "@/lib/ai/admin-providers";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { getPromptExecutionQueue } from "@/lib/queues/prompt-execution.queue";
import { PromptsRepository } from "@/lib/repositories";
import { isRedisAvailable } from "@/lib/redis/client";
import { executePromptExecutionJob } from "@/lib/services/llm-tracker";

export const maxDuration = 60;

const batchRunSchema = z.object({
  prompts: z.array(z.string().trim().min(5).max(500)).min(1).max(10),
  brandId: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(80).optional().default("general"),
});

const promptsRepo = new PromptsRepository();

export async function POST(req: Request) {
  const requestId = getRequestId(req);

  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const parsed = await validateBody(req, batchRunSchema, requestId);
  if (!parsed.success) return parsed.response;

  if (!adminHasLlmProviders()) {
    return Response.json(
      {
        error: "No LLM providers configured. Admin must set provider API keys in environment variables.",
        code: "NO_PROVIDERS_CONFIGURED",
        requestId,
      },
      { status: 503 },
    );
  }

  const { prompts, brandId, category } = parsed.data;
  const results: Array<{ promptText: string; promptId?: string; status: string; error?: string }> = [];

  for (const text of prompts) {
    try {
      const created = await promptsRepo.create({ text, category, brandId, userId });
      const jobPayload = {
        promptId: created.id,
        userId,
        brandId: created.brandId,
        requestId,
      };

      if (isRedisAvailable()) {
        try {
          const queue = getPromptExecutionQueue();
          if (queue) {
            await queue.add("run", jobPayload, {
              attempts: 3,
              backoff: { type: "exponential", delay: 1000 },
              removeOnComplete: 1000,
              removeOnFail: 5000,
            });
            results.push({ promptText: text, promptId: created.id, status: "queued" });
            continue;
          }
        } catch (err) {
          console.warn("[batch-run] queue failed, falling back to sync:", (err as Error).message);
        }
      }

      await executePromptExecutionJob(jobPayload);
      results.push({ promptText: text, promptId: created.id, status: "completed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[batch-run] prompt failed:", message);
      results.push({ promptText: text, status: "failed", error: message });
    }
  }

  return Response.json({ results, requestId });
}
