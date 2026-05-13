import type { AIProvider } from "@/lib/ai/providers/base.provider";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic.provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini.provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai.provider";
import { PerplexityProvider } from "@/lib/ai/providers/perplexity.provider";
import type { ProviderName } from "@/lib/ai/types";

export type LlmKeyProviderName = Extract<ProviderName, "openai" | "anthropic" | "gemini" | "perplexity">;

export function getLlmProviderInstance(provider: LlmKeyProviderName): AIProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    case "perplexity":
      return new PerplexityProvider();
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

/** `llm_platforms.name` row for each API provider. */
export const LLM_KEY_TO_PLATFORM_SLUG: Record<LlmKeyProviderName, string> = {
  openai: "chatgpt",
  anthropic: "claude",
  gemini: "gemini",
  perplexity: "perplexity",
};
