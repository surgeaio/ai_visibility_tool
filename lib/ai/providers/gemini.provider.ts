import { GoogleGenerativeAI } from "@google/generative-ai";
import { assertLlmKeyOrAllowDemo } from "@/lib/ai/llm-execution-policy";
import {
  createOpenRouterClient,
  hasOpenRouter,
  isOpenRouterKey,
} from "@/lib/ai/openrouter-client";
import { resolveOpenRouterModel } from "@/lib/ai/models";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

export class GeminiProvider extends AIProvider {
  readonly name = "gemini" as const;
  readonly weight = 25;
  readonly defaultModel = "gemini-2.0-flash";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const overrideKey = options.apiKey?.trim();
    const useOpenRouter =
      isOpenRouterKey(overrideKey) || (!overrideKey && hasOpenRouter());

    const directKey = useOpenRouter ? undefined : overrideKey || process.env.GOOGLE_AI_API_KEY;
    const effectiveKey = useOpenRouter
      ? overrideKey || process.env.OPENROUTER_API_KEY
      : directKey;

    assertLlmKeyOrAllowDemo(this.name, effectiveKey);

    const model = useOpenRouter
      ? resolveOpenRouterModel("gemini", options.model)
      : options.model ?? this.defaultModel;

    if (!effectiveKey) {
      return {
        provider: this.name,
        model,
        rawResponse: `Demo Gemini response for prompt: ${prompt.slice(0, 120)}`,
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

    const genAI = new GoogleGenerativeAI(effectiveKey);
    const modelClient = genAI.getGenerativeModel({ model });
    const response = await modelClient.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 1200,
      },
      systemInstruction: options.systemPrompt,
    });

    const raw = response.response.text();
    const usage = response.response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;
    return {
      provider: this.name,
      model,
      rawResponse: raw,
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
      process.env.OPENROUTER_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim(),
    );
  }

  estimateCost(inputTokens: number, outputTokens: number, _model?: string): number {
    void _model;
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.3;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
