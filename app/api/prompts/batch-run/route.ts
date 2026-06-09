export const dynamic = "force-dynamic";

import { z } from "zod";
import { adminHasLlmProviders } from "@/lib/ai/admin-providers";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { PromptsRepository } from "@/lib/repositories";
import { runSinglePrompt } from "@/lib/services/visibility-orchestrator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validators/common.schema";

export const maxDuration = 300;

const batchRunSchema = z.object({
  prompts: z.array(z.string().trim().min(5).max(500)).min(1).max(10),
  brandId: uuidSchema,
  category: z.string().trim().min(1).max(80).optional().default("general"),
});

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

  const allowed = await verifyBrandForUser(brandId, userId);
  if (!allowed) {
    return Response.json({ error: "Brand not found", requestId }, { status: 404 });
  }

  const results: Array<{ promptText: string; promptId?: string; status: string; error?: string }> = [];

  for (const text of prompts) {
    try {
      const created = await promptsRepo.create({ text, category, brandId, userId });
      await runSinglePrompt({
        brandId,
        promptId: created.id,
        triggeredBy: "manual",
        userId,
      });
      results.push({ promptText: text, promptId: created.id, status: "completed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[batch-run] prompt failed:", message);
      results.push({ promptText: text, status: "failed", error: message });
    }
  }

  return Response.json({ results, requestId });
}
