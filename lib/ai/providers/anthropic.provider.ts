import Anthropic from "@anthropic-ai/sdk";
import { assertLlmKeyOrAllowDemo } from "@/lib/ai/llm-execution-policy";
import {
  createOpenRouterClient,
  hasOpenRouter,
  isOpenRouterKey,
} from "@/lib/ai/openrouter-client";
import { AI_MODELS, resolveOpenRouterModel } from "@/lib/ai/models";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

export class AnthropicProvider extends AIProvider {
  readonly name = "anthropic" as const;
  readonly weight = 20;
  readonly defaultModel =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-20250514";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const overrideKey = options.apiKey?.trim();
    const useOpenRouter =
      isOpenRouterKey(overrideKey) || (!overrideKey && hasOpenRouter());

    const directKey = useOpenRouter ? undefined : overrideKey || process.env.ANTHROPIC_API_KEY;
    const effectiveKey = useOpenRouter
      ? overrideKey || process.env.OPENROUTER_API_KEY
      : directKey;

    assertLlmKeyOrAllowDemo(this.name, effectiveKey);

    const model = useOpenRouter
      ? resolveOpenRouterModel("claude", options.model)
      : options.model ?? this.defaultModel;

    if (!effectiveKey) {
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

    if (useOpenRouter) {
      const client = createOpenRouterClient(overrideKey, options.timeoutMs ?? 30_000);
      if (!client) throw new Error("Failed to create OpenRouter client");

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

    const client = new Anthropic({ apiKey: effectiveKey, timeout: options.timeoutMs ?? 30_000 });
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
      cost: this.estimateCost(inputTokens, outputTokens, model),
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(
      process.env.OPENROUTER_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim(),
    );
  }

  estimateCost(inputTokens: number, outputTokens: number, _model?: string): number {
    void _model;
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return Number((inputCost + outputCost).toFixed(6));
  }
}

void AI_MODELS;
