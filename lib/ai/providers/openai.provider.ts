import OpenAI from "openai";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

export class OpenAIProvider extends AIProvider {
  readonly name = "openai" as const;
  readonly weight = 40;
  readonly defaultModel = "gpt-4o";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const model = options.model ?? this.defaultModel;
    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      return {
        provider: this.name,
        model,
        rawResponse: `Demo OpenAI response for prompt: ${prompt.slice(0, 120)}`,
        citations: [],
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        latency: Date.now() - started,
        timestamp: new Date(),
        requestId: options.requestId,
      };
    }

    const client = new OpenAI({ apiKey: key, timeout: options.timeoutMs ?? 30_000 });
    const response = await client.chat.completions.create({
      model,
      messages: [
        ...(options.systemPrompt ? [{ role: "system" as const, content: options.systemPrompt }] : []),
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
      cost: this.estimateCost(inputTokens, outputTokens),
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 5;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
