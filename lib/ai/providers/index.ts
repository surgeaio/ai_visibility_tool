import { AnthropicProvider } from "@/lib/ai/providers/anthropic.provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini.provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai.provider";
import type { ProviderName } from "@/lib/ai/types";

export { AIProvider } from "@/lib/ai/providers/base.provider";
export { OpenAIProvider, AnthropicProvider, GeminiProvider };

export const providerRegistry = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
} as const;

export function getProvider(name: ProviderName) {
  return providerRegistry[name];
}
