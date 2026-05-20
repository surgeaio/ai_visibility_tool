import { createOpenRouterClient } from "@/lib/ai/openrouter-client";
import { VISIBILITY_MODELS } from "@/lib/ai/models";

export interface AICallResult {
  success: boolean;
  modelSlug: string;   // "chatgpt" | "claude" | "gemini" | "perplexity"
  modelId: string;     // actual OpenRouter model ID, e.g. "meta-llama/llama-4-maverick:free"
  responseText: string;
  tokensUsed?: number;
  error?: string;
}

const TIMEOUT_MS = 60_000;

/**
 * Call a single model via OpenRouter.
 *
 * @param modelSlug  DB slug ("chatgpt", "claude", "gemini", "perplexity")
 * @param prompt     User prompt text
 * @param options    Optional overrides for tokens, temperature, system prompt, api key
 */
export async function callModel(
  modelSlug: string,
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    /** Override API key (used for per-user stored OpenRouter keys). Defaults to OPENROUTER_API_KEY env. */
    apiKey?: string;
  },
): Promise<AICallResult> {
  const modelId = VISIBILITY_MODELS[modelSlug];

  if (!modelId) {
    return {
      success: false,
      modelSlug,
      modelId: "unknown",
      responseText: "",
      error: `Unknown model slug: ${modelSlug}`,
    };
  }

  const client = createOpenRouterClient(options?.apiKey || null, TIMEOUT_MS);

  if (!client) {
    return {
      success: false,
      modelSlug,
      modelId,
      responseText: "",
      error: "OPENROUTER_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.",
    };
  }

  try {
    console.log(`[callModel] ${modelSlug} → ${modelId}`);

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const completion = await client.chat.completions.create({
      model: modelId,
      messages,
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0.7,
    });

    const responseText = completion.choices?.[0]?.message?.content ?? "";

    if (!responseText.trim()) {
      return {
        success: false,
        modelSlug,
        modelId,
        responseText: "",
        error: "Empty response from model",
      };
    }

    console.log(`[callModel] ${modelSlug} OK (${responseText.length} chars)`);

    return {
      success: true,
      modelSlug,
      modelId,
      responseText,
      tokensUsed: completion.usage?.total_tokens,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[callModel] ${modelSlug} (${modelId}) FAILED: ${errMsg}`);
    return {
      success: false,
      modelSlug,
      modelId,
      responseText: "",
      error: errMsg,
    };
  }
}

/**
 * Run the same prompt on multiple models in parallel.
 * Never throws — failures are captured per-result.
 */
export async function callMultipleModels(
  modelSlugs: string[],
  prompt: string,
  options?: Parameters<typeof callModel>[2],
): Promise<AICallResult[]> {
  console.log(`[callMultipleModels] ${modelSlugs.length} model(s): ${modelSlugs.join(", ")}`);

  const settled = await Promise.allSettled(
    modelSlugs.map((slug) => callModel(slug, prompt, options)),
  );

  return settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      success: false,
      modelSlug: modelSlugs[i],
      modelId: VISIBILITY_MODELS[modelSlugs[i]] ?? "unknown",
      responseText: "",
      error: r.reason instanceof Error ? r.reason.message : "Promise rejected",
    };
  });
}
