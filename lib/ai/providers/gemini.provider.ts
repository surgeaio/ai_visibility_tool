import { GoogleGenerativeAI } from "@google/generative-ai";
import { assertLlmKeyOrAllowDemo } from "@/lib/ai/llm-execution-policy";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

function resolveGeminiApiKey(overrideKey?: string): string | undefined {
  return (
    overrideKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim()
  );
}

export class GeminiProvider extends AIProvider {
  readonly name = "gemini" as const;
  readonly weight = 25;
  readonly defaultModel = "gemini-1.5-flash";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const apiKey = resolveGeminiApiKey(options.apiKey);

    assertLlmKeyOrAllowDemo(this.name, apiKey);

    const model = options.model ?? this.defaultModel;

    if (!apiKey) {
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

    const genAI = new GoogleGenerativeAI(apiKey);
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
    return Boolean(resolveGeminiApiKey());
  }

  estimateCost(inputTokens: number, outputTokens: number, _model?: string): number {
    void _model;
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.3;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
