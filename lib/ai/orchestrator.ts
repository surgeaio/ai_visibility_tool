import { extractCitations } from "@/lib/ai/citation-extractor";
import { getCachedResponse, makeAICacheKey, setCachedResponse } from "@/lib/ai/cache";
import { canSpend, recordSpend, shouldUseCheaperModel } from "@/lib/ai/cost-optimizer";
import { getProvider } from "@/lib/ai/providers";
import type {
  AIExecuteOptions,
  AIResponse,
  OrchestratorResult,
  ProviderName,
} from "@/lib/ai/types";

const DEFAULT_PROVIDER_ORDER: ProviderName[] = [
  "openai",
  "gemini",
  "anthropic",
];

async function executeWithRetry(
  providerName: ProviderName,
  prompt: string,
  options: AIExecuteOptions,
): Promise<AIResponse> {
  const provider = getProvider(providerName);
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await provider.execute(prompt, options);
      return {
        ...response,
        citations: extractCitations(
          providerName,
          response.rawResponse,
          response.citations,
        ),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown provider error");
      const delay = attempt === 1 ? 500 : attempt === 2 ? 1500 : 3000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error(`Execution failed for provider: ${providerName}`);
}

export async function executePromptAcrossModels(params: {
  prompt: string;
  requestId: string;
  providers?: ProviderName[];
  options?: Omit<AIExecuteOptions, "requestId">;
}): Promise<OrchestratorResult> {
  const providers = params.providers?.length ? params.providers : DEFAULT_PROVIDER_ORDER;
  const options: AIExecuteOptions = {
    requestId: params.requestId,
    temperature: params.options?.temperature ?? 0.2,
    maxTokens: params.options?.maxTokens ?? 1200,
    timeoutMs: params.options?.timeoutMs ?? 30_000,
    systemPrompt: params.options?.systemPrompt,
    model: params.options?.model,
  };

  const failures: OrchestratorResult["failures"] = [];
  const results = await Promise.all(
    providers.map(async (providerName) => {
      if (!canSpend("global")) {
        failures.push({ provider: providerName, error: "Daily budget exceeded" });
        return null;
      }
      const model = shouldUseCheaperModel(providerName)
        ? providerName === "openai"
          ? "gpt-4o-mini"
          : options.model
        : options.model;
      const cacheKey = makeAICacheKey({
        provider: providerName,
        model: model ?? "default",
        prompt: params.prompt,
        temperature: options.temperature,
      });
      const cached = await getCachedResponse(cacheKey);
      if (cached) {
        return {
          provider: providerName,
          model: model ?? "cached",
          rawResponse: cached,
          citations: extractCitations(providerName, cached, []),
          tokensUsed: { input: 0, output: 0 },
          cost: 0,
          latency: 0,
          timestamp: new Date(),
          requestId: params.requestId,
        } as AIResponse;
      }
      try {
        const response = await executeWithRetry(providerName, params.prompt, {
          ...options,
          model,
        });
        await setCachedResponse(cacheKey, response.rawResponse);
        recordSpend(response.cost, "global");
        return response;
      } catch (error) {
        failures.push({
          provider: providerName,
          error: error instanceof Error ? error.message : "Unknown execution error",
        });
        return null;
      }
    }),
  );

  const responses = results.filter((result): result is AIResponse => result !== null);
  return {
    requestId: params.requestId,
    prompt: params.prompt,
    responses,
    failures,
    totalCost: responses.reduce((sum, item) => sum + item.cost, 0),
    totalLatency: responses.reduce((sum, item) => sum + item.latency, 0),
  };
}

export async function executeWithFallback(params: {
  prompt: string;
  requestId: string;
  providerChain?: ProviderName[];
  options?: Omit<AIExecuteOptions, "requestId">;
}) {
  const chain = params.providerChain?.length ? params.providerChain : DEFAULT_PROVIDER_ORDER;
  for (const provider of chain) {
    try {
      const result = await executeWithRetry(provider, params.prompt, {
        requestId: params.requestId,
        ...params.options,
      });
      return result;
    } catch {
      continue;
    }
  }
  throw new Error("All fallback providers failed");
}
