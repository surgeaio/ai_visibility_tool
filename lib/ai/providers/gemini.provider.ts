import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "@/lib/ai/providers/base.provider";
import type { AIExecuteOptions, AIResponse } from "@/lib/ai/types";

export class GeminiProvider extends AIProvider {
  readonly name = "gemini" as const;
  readonly weight = 25;
  readonly defaultModel = "gemini-2.0-flash";

  async execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse> {
    const started = Date.now();
    const model = options.model ?? this.defaultModel;
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) {
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

    const genAI = new GoogleGenerativeAI(key);
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
      cost: this.estimateCost(inputTokens, outputTokens),
      latency: Date.now() - started,
      timestamp: new Date(),
      requestId: options.requestId,
    };
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.GOOGLE_AI_API_KEY?.trim());
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.35;
    const outputCost = (outputTokens / 1_000_000) * 1.05;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
