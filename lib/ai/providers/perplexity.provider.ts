import { assertLlmKeyOrAllowDemo } from "@/lib/ai/llm-execution-policy";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse, Citation } from "@/lib/ai/types";

type PerplexityChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  citations?: string[];
};

export class PerplexityProvider extends AIProvider {
  readonly name = "perplexity" as const;
  readonly weight = 15;
  readonly defaultModel = "sonar";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const model = options.model ?? this.defaultModel;
    const key = options.apiKey?.trim() || process.env.PERPLEXITY_API_KEY;
    assertLlmKeyOrAllowDemo(this.name, key);
    if (!key) {
      return {
        provider: this.name,
        model,
        rawResponse: `Demo Perplexity response for prompt: ${prompt.slice(0, 120)}`,
        citations: [],
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        latency: Date.now() - started,
        timestamp: new Date(),
        requestId: options.requestId,
      };
    }

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1200,
        messages: [
          ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
    });
    if (!response.ok) throw new Error(`Perplexity request failed: ${response.status}`);
    const payload = (await response.json()) as PerplexityChatResponse;
    const citations: Citation[] = (payload.citations ?? []).map((url, index) => ({
      url,
      domain: safeDomain(url),
      position: index + 1,
    }));
    const inputTokens = payload.usage?.prompt_tokens ?? 0;
    const outputTokens = payload.usage?.completion_tokens ?? 0;
    return {
      provider: this.name,
      model,
      rawResponse: payload.choices?.[0]?.message?.content ?? "",
      citations,
      tokensUsed: { input: inputTokens, output: outputTokens },
      cost: this.estimateCost(inputTokens, outputTokens, model),
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.PERPLEXITY_API_KEY?.trim());
  }

  estimateCost(inputTokens: number, outputTokens: number, _model?: string): number {
    void _model;
    const inputCost = (inputTokens / 1_000_000) * 1;
    const outputCost = (outputTokens / 1_000_000) * 1;
    return Number((inputCost + outputCost).toFixed(6));
  }
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "unknown";
  }
}
