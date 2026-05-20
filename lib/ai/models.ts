/**
 * Canonical OpenRouter model slugs used across the visibility pipeline.
 *
 * Keep this list in sync with the providers in `lib/ai/providers/*` and any
 * dashboards that surface model names. Slugs follow OpenRouter's
 * `<vendor>/<model>` convention (https://openrouter.ai/models).
 */
export const AI_MODELS = {
  openai: "openai/gpt-4o-mini",
  claude: "anthropic/claude-sonnet-4",
  gemini: "google/gemini-2.5-pro",
} as const;

export type OpenRouterModelKey = keyof typeof AI_MODELS;

/**
 * Map our internal provider slugs (used in `ai-executor`, `llm_platforms`, etc.)
 * to OpenRouter model IDs.
 */
export const PROVIDER_TO_OPENROUTER_MODEL: Record<string, string> = {
  openai: AI_MODELS.openai,
  chatgpt: AI_MODELS.openai,
  anthropic: AI_MODELS.claude,
  claude: AI_MODELS.claude,
  gemini: AI_MODELS.gemini,
  google: AI_MODELS.gemini,
};

/** Allow opt-in overrides via env (e.g. `OPENROUTER_MODEL_OPENAI=openai/gpt-4o`). */
export function resolveOpenRouterModel(
  key: OpenRouterModelKey,
  override?: string | null,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  const envName =
    key === "openai"
      ? process.env.OPENROUTER_MODEL_OPENAI
      : key === "claude"
        ? process.env.OPENROUTER_MODEL_CLAUDE
        : process.env.OPENROUTER_MODEL_GEMINI;
  return envName?.trim() || AI_MODELS[key];
}
