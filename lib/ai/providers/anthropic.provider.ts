import Anthropic from "@anthropic-ai/sdk";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

export class AnthropicProvider extends AIProvider {
  readonly name = "anthropic" as const;
  readonly weight = 20;
  readonly defaultModel = "claude-3-5-sonnet-20241022";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const model = options.model ?? this.defaultModel;
    const key = process.env.ANTHROPIC_API_KEY;

    if (!key) {
      return {
        provider: this.name,
        model,
        rawResponse: `Demo Anthropic response for prompt: ${prompt.slice(0, 120)}`,
        citations: [],
        tokensUsed: { input: 0, output: 0 },
        cost: 0,
        latency: Date.now() - started,
        timestamp: new Date(),
        requestId: options.requestId,
      };
    }

    const client = new Anthropic({ apiKey: key, timeout: options.timeoutMs ?? 30_000 });
    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 1200,
      temperature: options.temperature ?? 0.2,
      system: options.systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((block) => block.type === "text");
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    return {
      provider: this.name,
      model,
      rawResponse: textBlock && textBlock.type === "text" ? textBlock.text : "",
      citations: [],
      tokensUsed: { input: inputTokens, output: outputTokens },
      cost: this.estimateCost(inputTokens, outputTokens),
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
