/**
 * LLM model configuration for the visibility pipeline.
 *
 * Each slot uses its official provider SDK and API key — never OpenRouter.
 * Required env vars (add in Vercel → Settings → Environment Variables):
 *   OPENAI_API_KEY       → ChatGPT  (gpt-4o-mini)
 *   ANTHROPIC_API_KEY    → Claude   (claude-haiku-4-5)
 *   GOOGLE_API_KEY       → Gemini   (gemini-1.5-flash)
 *   PERPLEXITY_API_KEY   → Perplexity (sonar)
 */

// ---------------------------------------------------------------------------
// Official production models — one per provider
// ---------------------------------------------------------------------------
export const PRODUCTION_MODELS = {
  chatgpt:    "gpt-4o-mini",
  claude:     "claude-haiku-4-5",
  gemini:     "gemini-1.5-flash",
  perplexity: "sonar",
} as const;

// ---------------------------------------------------------------------------
// VISIBILITY_MODELS — maps DB slug → model name used in logs/analysis
// ---------------------------------------------------------------------------
export const VISIBILITY_MODELS: Record<string, string> = {
  chatgpt:    PRODUCTION_MODELS.chatgpt,
  claude:     PRODUCTION_MODELS.claude,
  gemini:     PRODUCTION_MODELS.gemini,
  perplexity: PRODUCTION_MODELS.perplexity,
};

/** Models run by default during a visibility check. */
export const DEFAULT_VISIBILITY_MODELS = [
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
] as const;

/** Human-readable display names for the dashboard. */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  chatgpt:    "ChatGPT",
  claude:     "Claude",
  gemini:     "Gemini",
  perplexity: "Perplexity",
};

/** All models available for the UI dropdown (only official providers). */
export const ALL_AVAILABLE_MODELS: Array<{ slug: string; label: string }> = [
  { slug: "chatgpt",    label: "ChatGPT"    },
  { slug: "claude",     label: "Claude"     },
  { slug: "gemini",     label: "Gemini"     },
  { slug: "perplexity", label: "Perplexity" },
];

// ---------------------------------------------------------------------------
// AI_MODELS — used by provider classes and analysis helpers
// ---------------------------------------------------------------------------
export const AI_MODELS = {
  openai:  PRODUCTION_MODELS.chatgpt,
  claude:  PRODUCTION_MODELS.claude,
  gemini:  PRODUCTION_MODELS.gemini,
} as const;

export type OpenRouterModelKey = keyof typeof AI_MODELS;

/** Map provider slugs → model names. */
export const PROVIDER_TO_OPENROUTER_MODEL: Record<string, string> = {
  openai:    AI_MODELS.openai,
  chatgpt:   AI_MODELS.openai,
  anthropic: AI_MODELS.claude,
  claude:    AI_MODELS.claude,
  gemini:    AI_MODELS.gemini,
  google:    AI_MODELS.gemini,
};

/** Resolve the model name for a given key, with optional runtime override. */
export function resolveOpenRouterModel(
  key: OpenRouterModelKey,
  override?: string | null,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return AI_MODELS[key];
}

// ---------------------------------------------------------------------------
// FREE_MODELS kept for any legacy references — mirrors production models
// ---------------------------------------------------------------------------
export const FREE_MODELS = PRODUCTION_MODELS;
