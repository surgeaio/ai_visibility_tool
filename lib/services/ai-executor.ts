import { adminHasLlmProviders, getAdminLlmProviders } from "@/lib/ai/admin-providers";
import {
  getLlmProviderInstance,
  LLM_KEY_TO_PLATFORM_SLUG,
  type LlmKeyProviderName,
} from "@/lib/ai/llm-provider-factory";
import { UserApiKeysRepository } from "@/lib/repositories/user-api-keys.repo";

export type AIModelName = "chatgpt" | "claude" | "gemini" | "perplexity";

const MODEL_TO_PROVIDER: Record<AIModelName, LlmKeyProviderName> = {
  chatgpt: "openai",
  claude: "anthropic",
  gemini: "gemini",
  perplexity: "perplexity",
};

export interface AIModelResponse {
  model: AIModelName;
  responseText: string;
  sources: Array<{ url: string; title?: string }>;
  tokensUsed?: number;
  error?: string;
  status: "success" | "failed";
}

const TIMEOUT_MS = 60_000;
const SYSTEM_PROMPT =
  "You are a helpful assistant. When asked about products or services, list specific brand names with brief descriptions.";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ]);
}

async function runOnModel(model: AIModelName, prompt: string, apiKey: string): Promise<AIModelResponse> {
  const providerName = MODEL_TO_PROVIDER[model];
  try {
    const provider = getLlmProviderInstance(providerName);
    const response = await withTimeout(
      provider.execute(prompt, {
        requestId: `visibility-${model}-${Date.now()}`,
        apiKey,
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1500,
        timeoutMs: TIMEOUT_MS,
      }),
      TIMEOUT_MS,
    );

    const citations = (response.citations ?? []).map((c) => ({
      url: c.url,
      title: c.title,
    }));

    return {
      model,
      responseText: response.rawResponse,
      sources: citations,
      tokensUsed: (response.tokensUsed?.input ?? 0) + (response.tokensUsed?.output ?? 0),
      status: "success",
    };
  } catch (err) {
    return {
      model,
      responseText: "",
      sources: [],
      error: err instanceof Error ? err.message : "Unknown error",
      status: "failed",
    };
  }
}

function resolveEnvApiKeys(): Map<AIModelName, string> {
  const map = new Map<AIModelName, string>();
  const providers = getAdminLlmProviders();
  for (const p of providers) {
    const slug = LLM_KEY_TO_PLATFORM_SLUG[p.provider] as AIModelName;
    if (slug) map.set(slug, p.apiKey);
  }
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    if (!map.has("chatgpt")) map.set("chatgpt", openRouterKey);
    if (!map.has("claude")) map.set("claude", openRouterKey);
    if (!map.has("gemini")) map.set("gemini", openRouterKey);
  }
  if (!map.has("chatgpt") && process.env.OPENAI_API_KEY) map.set("chatgpt", process.env.OPENAI_API_KEY);
  if (!map.has("claude") && process.env.ANTHROPIC_API_KEY) map.set("claude", process.env.ANTHROPIC_API_KEY);
  if (!map.has("gemini") && process.env.GOOGLE_AI_API_KEY) map.set("gemini", process.env.GOOGLE_AI_API_KEY);
  if (!map.has("perplexity") && process.env.PERPLEXITY_API_KEY) {
    map.set("perplexity", process.env.PERPLEXITY_API_KEY);
  }
  return map;
}

async function resolveApiKeys(userId?: string): Promise<Map<AIModelName, string>> {
  const map = resolveEnvApiKeys();
  if (!userId?.trim()) return map;

  try {
    const userKeys = await new UserApiKeysRepository().listActiveLlmKeysDecrypted(userId);
    for (const k of userKeys) {
      const slug = LLM_KEY_TO_PLATFORM_SLUG[k.provider] as AIModelName;
      if (slug && !map.has(slug)) map.set(slug, k.apiKey);
    }
  } catch (err) {
    console.error(
      "[ai-executor] Failed to load user API keys:",
      err instanceof Error ? err.message : err,
    );
  }
  return map;
}

export async function runPromptOnAllModels(
  prompt: string,
  models: AIModelName[] = ["chatgpt", "claude", "gemini", "perplexity"],
  userId?: string,
): Promise<AIModelResponse[]> {
  const keys = await resolveApiKeys(userId);
  if (keys.size === 0) {
    return models.map((model) => ({
      model,
      responseText: "",
      sources: [],
      error: "No LLM API keys configured (add keys in Settings or Vercel env)",
      status: "failed",
    }));
  }

  const configuredModels = models.filter((m) => keys.has(m));
  if (!configuredModels.length) {
    return models.map((model) => ({
      model,
      responseText: "",
      sources: [],
      error: `${model} API key not configured`,
      status: "failed",
    }));
  }

  console.log(
    `[ai-executor] Running ${configuredModels.length} model(s) with keys: ${configuredModels.join(", ")}`,
  );

  const results = await Promise.all(
    configuredModels.map(async (model) => runOnModel(model, prompt, keys.get(model)!)),
  );
  return results;
}
