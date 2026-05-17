import type { LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";

export type AdminLlmProvider = { provider: LlmKeyProviderName; apiKey: string };

/** Providers with admin-configured env API keys (shared across all users). */
export function getAdminLlmProviders(): AdminLlmProvider[] {
  const out: AdminLlmProvider[] = [];
  const openai = process.env.OPENAI_API_KEY?.trim();
  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  const gemini = process.env.GOOGLE_AI_API_KEY?.trim();
  const perplexity = process.env.PERPLEXITY_API_KEY?.trim();
  if (openai) out.push({ provider: "openai", apiKey: openai });
  if (anthropic) out.push({ provider: "anthropic", apiKey: anthropic });
  if (gemini) out.push({ provider: "gemini", apiKey: gemini });
  if (perplexity) out.push({ provider: "perplexity", apiKey: perplexity });
  return out;
}

export function adminHasLlmProviders(): boolean {
  return getAdminLlmProviders().length > 0;
}
