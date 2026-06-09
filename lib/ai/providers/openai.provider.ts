import OpenAI from "openai";
import { assertLlmKeyOrAllowDemo } from "@/lib/ai/llm-execution-policy";
import { AI_MODELS } from "@/lib/ai/models";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

export class OpenAIProvider extends AIProvider {
  readonly name = "openai" as const;
  readonly weight = 40;
  readonly defaultModel = "gpt-3.5-turbo";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const apiKey = options.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();

    assertLlmKeyOrAllowDemo(this.name, apiKey);

    const model = options.model ?? this.defaultModel;

    if (!apiKey) {
      return this.demoResponse(prompt, model, options, started);
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.openai.com/v1",
      timeout: options.timeoutMs ?? 30_000,
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1200,
    });

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    return {
      provider: this.name,
      model,
      rawResponse: response.choices[0]?.message?.content ?? "",
      citations: [],
      tokensUsed: { input: inputTokens, output: outputTokens },
      cost: this.estimateCost(inputTokens, outputTokens, model),
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  estimateCost(inputTokens: number, outputTokens: number, model?: string): number {
    const m = (model ?? this.defaultModel).toLowerCase();
    if (m.includes("gpt-3.5")) {
      const inputCost = (inputTokens / 1_000_000) * 0.5;
      const outputCost = (outputTokens / 1_000_000) * 1.5;
      return Number((inputCost + outputCost).toFixed(6));
    }
    if (m.includes("gpt-4o-mini") || m.includes("4o-mini")) {
      const inputCost = (inputTokens / 1_000_000) * 0.15;
      const outputCost = (outputTokens / 1_000_000) * 0.6;
      return Number((inputCost + outputCost).toFixed(6));
    }
    const inputCost = (inputTokens / 1_000_000) * 5;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return Number((inputCost + outputCost).toFixed(6));
  }

  private demoResponse(
    prompt: string,
    model: string,
    options: AIExecuteOptions,
    started: number,
  ): AIResponse {
    return {
      provider: this.name,
      model: model || AI_MODELS.openai,
      rawResponse: `Demo OpenAI response for prompt: ${prompt.slice(0, 120)}`,
      citations: [],
      tokensUsed: { input: 0, output: 0 },
      cost: 0,
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }
}
