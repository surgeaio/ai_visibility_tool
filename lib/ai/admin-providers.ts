import type { LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";

export type AdminLlmProvider = { provider: LlmKeyProviderName; apiKey: string };

/**
 * Providers with admin-configured env API keys (shared across all users).
 *
 * When `OPENROUTER_API_KEY` is set it satisfies openai / anthropic / gemini at
 * once (the providers detect it and route through OpenRouter). Direct
 * `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY` are kept as
 * legacy fallbacks. Perplexity always uses its own key.
 */
export function getAdminLlmProviders(): AdminLlmProvider[] {
  const out: AdminLlmProvider[] = [];
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  const openai = process.env.OPENAI_API_KEY?.trim();
  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  const gemini = process.env.GOOGLE_AI_API_KEY?.trim();

  if (openrouter) {
    out.push({ provider: "openai", apiKey: openrouter });
    out.push({ provider: "anthropic", apiKey: openrouter });
    out.push({ provider: "gemini", apiKey: openrouter });
  } else {
    if (openai) out.push({ provider: "openai", apiKey: openai });
    if (anthropic) out.push({ provider: "anthropic", apiKey: anthropic });
    if (gemini) out.push({ provider: "gemini", apiKey: gemini });
  }
  return out;
}

export function adminHasLlmProviders(): boolean {
  return getAdminLlmProviders().length > 0;
}
