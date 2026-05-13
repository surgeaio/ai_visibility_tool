import type { AIExecuteOptions, AIResponse, ProviderName } from "@/lib/ai/types";

export abstract class AIProvider {
  abstract readonly name: ProviderName;
  abstract readonly weight: number;
  abstract readonly defaultModel: string;

  abstract execute(prompt: string, options: AIExecuteOptions): Promise<AIResponse>;
  abstract healthCheck(): Promise<boolean>;
  abstract estimateCost(inputTokens: number, outputTokens: number, model?: string): number;
}
