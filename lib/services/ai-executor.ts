import { callMultipleModels } from "@/lib/ai/call-model";
import { VISIBILITY_MODELS } from "@/lib/ai/models";
import { isOpenRouterKey } from "@/lib/ai/openrouter-client";
import { UserApiKeysRepository } from "@/lib/repositories/user-api-keys.repo";

export type AIModelName = "chatgpt" | "claude" | "gemini" | "perplexity";

export interface AIModelResponse {
  model: AIModelName;
  responseText: string;
  sources: Array<{ url: string; title?: string }>;
  tokensUsed?: number;
  error?: string;
  status: "success" | "failed";
}

const SYSTEM_PROMPT =
  "You are a helpful assistant. When asked about products or services, list specific brand names with brief descriptions.";

/**
 * Resolve the best available OpenRouter API key.
 *
 * Priority:
 *  1. OPENROUTER_API_KEY env var (admin/shared key)
 *  2. Per-user stored key that looks like an OpenRouter key
 *
 * Returns undefined when no key is found anywhere.
 */
async function resolveOpenRouterKey(userId?: string): Promise<string | undefined> {
  const envKey = process.env.OPENROUTER_API_KEY?.trim();
  if (envKey) return envKey;

  if (!userId?.trim()) return undefined;

  try {
    const userKeys = await new UserApiKeysRepository().listActiveLlmKeysDecrypted(userId);
    const orKey = userKeys.find((k) => isOpenRouterKey(k.apiKey));
    if (orKey) return orKey.apiKey;
  } catch (err) {
    console.error(
      "[ai-executor] Failed to load user API keys:",
      err instanceof Error ? err.message : err,
    );
  }

  return undefined;
}

/**
 * Run a single prompt on one or more AI models via the OpenRouter gateway.
 *
 * Each model runs in parallel; a failure on one never blocks the others.
 * The return shape is identical to the legacy provider-class path so all
 * downstream callers (visibility-orchestrator, persist, etc.) remain unchanged.
 */
export async function runPromptOnAllModels(
  prompt: string,
  models: AIModelName[] = ["chatgpt", "claude", "gemini", "perplexity"],
  userId?: string,
): Promise<AIModelResponse[]> {
  const apiKey = await resolveOpenRouterKey(userId);

  if (!apiKey) {
    console.error("[ai-executor] No OPENROUTER_API_KEY found in env or user settings");
    return models.map((model) => ({
      model,
      responseText: "",
      sources: [],
      error:
        "OPENROUTER_API_KEY not configured. Add it in Vercel → Settings → Environment Variables.",
      status: "failed" as const,
    }));
  }

  // Only run models that have a mapping in VISIBILITY_MODELS
  const runnable = models.filter((m) => Boolean(VISIBILITY_MODELS[m]));
  const skipped = models.filter((m) => !VISIBILITY_MODELS[m]);

  if (skipped.length) {
    console.warn(`[ai-executor] No model mapping for: ${skipped.join(", ")} — skipping`);
  }

  if (!runnable.length) {
    return models.map((model) => ({
      model,
      responseText: "",
      sources: [],
      error: "No OpenRouter model ID configured for this slot",
      status: "failed" as const,
    }));
  }

  console.log(`[ai-executor] Running ${runnable.length} model(s): ${runnable.join(", ")}`);

  const results = await callMultipleModels(runnable, prompt, {
    maxTokens: 1500,
    temperature: 0.3,
    systemPrompt: SYSTEM_PROMPT,
    apiKey,
  });

  // Build final array preserving original model order, inserting skipped failures
  const resultMap = new Map(results.map((r) => [r.modelSlug, r]));

  return models.map((model) => {
    const r = resultMap.get(model);
    if (!r) {
      return {
        model,
        responseText: "",
        sources: [],
        error: "No OpenRouter model ID configured for this slot",
        status: "failed" as const,
      };
    }
    return {
      model,
      responseText: r.responseText,
      sources: [],
      tokensUsed: r.tokensUsed,
      error: r.error,
      status: r.success ? ("success" as const) : ("failed" as const),
    };
  });
}
