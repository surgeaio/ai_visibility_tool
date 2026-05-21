/**
 * Visibility pipeline executor.
 *
 * Routes all calls through OpenRouter (OPENROUTER_API_KEY).
 * Direct provider keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
 * are used as fallback only when OPENROUTER_API_KEY is absent.
 */
import {
  callMultiplePlatforms,
  getAvailablePlatforms,
  type LLMPlatform,
} from "@/lib/ai/llm-providers";

export type AIModelName = "chatgpt" | "claude" | "gemini" | "perplexity";

export interface AIModelResponse {
  model: AIModelName;
  responseText: string;
  sources: Array<{ url: string; title?: string }>;
  tokensUsed?: number;
  error?: string;
  status: "success" | "failed";
}

/**
 * Run a single prompt on one or more AI platforms via official SDKs.
 *
 * Platforms with missing API keys are skipped with a clear error message.
 * Never throws — failures are captured per-result.
 */
export async function runPromptOnAllModels(
  prompt: string,
  models: AIModelName[] = ["chatgpt", "claude", "gemini", "perplexity"],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId?: string,
): Promise<AIModelResponse[]> {
  const platforms = models as LLMPlatform[];
  const available = getAvailablePlatforms(platforms);
  const missing = platforms.filter((p) => !available.includes(p));

  if (missing.length) {
    console.warn(
      `[ai-executor] Missing API keys for: ${missing.join(", ")} — these platforms will be skipped`,
    );
  }

  if (!available.length) {
    console.error("[ai-executor] No API keys configured for any platform");
    return models.map((model) => ({
      model,
      responseText: "",
      sources: [],
      error:
        "No LLM API keys configured. Add OPENROUTER_API_KEY in Vercel → Settings → Environment Variables (recommended), or individual provider keys OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY.",
      status: "failed" as const,
    }));
  }

  console.log(`[ai-executor] Running ${available.length} platform(s): ${available.join(", ")}`);

  const results = await callMultiplePlatforms(available, prompt);

  // Build response array preserving original model order
  const resultMap = new Map(results.map((r) => [r.platform, r]));

  return models.map((model) => {
    const r = resultMap.get(model as LLMPlatform);
    if (!r) {
      // Platform was skipped due to missing key
      return {
        model,
        responseText: "",
        sources: [],
        error: `API key not configured for ${model}. Add OPENROUTER_API_KEY in Vercel → Settings → Environment Variables.`,
        status: "failed" as const,
      };
    }
    if (!r.ok) {
      return {
        model,
        responseText: "",
        sources: [],
        error: r.error,
        status: "failed" as const,
      };
    }
    return {
      model,
      responseText: r.text,
      sources: r.sources,
      tokensUsed: r.tokensUsed,
      status: "success" as const,
    };
  });
}
