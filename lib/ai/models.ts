/**
 * LLM model configuration for the visibility pipeline.
 *
 * Primary execution uses OpenRouter (single OPENROUTER_API_KEY).
 * Direct provider SDK calls (fallback) use bare model names from PRODUCTION_MODELS.
 *
 * Required env var:
 *   OPENROUTER_API_KEY  → powers ChatGPT, Claude, Gemini via one key
 *
 * Optional direct-provider fallbacks (used only when OPENROUTER_API_KEY is absent):
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, PERPLEXITY_API_KEY
 */

// ---------------------------------------------------------------------------
// Bare model names — used only for direct provider SDK calls (fallback path)
// ---------------------------------------------------------------------------
export const PRODUCTION_MODELS = {
  chatgpt:    "gpt-4o-mini",
  claude:     "claude-haiku-4-5",
  gemini:     "gemini-1.5-flash",
  perplexity: "sonar",
} as const;

// ---------------------------------------------------------------------------
// AI_MODELS — OpenRouter model IDs (provider/model format).
// Used by: providers, sentiment, response-analyzer, visibility-recommendations.
// ---------------------------------------------------------------------------
export const AI_MODELS = {
  openai:  "openai/gpt-4o-mini",
  claude:  "anthropic/claude-sonnet-4",
  gemini:  "google/gemini-2.5-flash-preview",
} as const;

export type OpenRouterModelKey = keyof typeof AI_MODELS;

// ---------------------------------------------------------------------------
// VISIBILITY_MODELS — maps DB slug → OpenRouter model ID
// ---------------------------------------------------------------------------
export const VISIBILITY_MODELS: Record<string, string> = {
  chatgpt:    AI_MODELS.openai,
  claude:     AI_MODELS.claude,
  gemini:     AI_MODELS.gemini,
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

/** All models available for the UI dropdown. */
export const ALL_AVAILABLE_MODELS: Array<{ slug: string; label: string }> = [
  { slug: "chatgpt",    label: "ChatGPT"    },
  { slug: "claude",     label: "Claude"     },
  { slug: "gemini",     label: "Gemini"     },
  { slug: "perplexity", label: "Perplexity" },
];

/** Map provider slugs → OpenRouter model IDs. */
export const PROVIDER_TO_OPENROUTER_MODEL: Record<string, string> = {
  openai:    AI_MODELS.openai,
  chatgpt:   AI_MODELS.openai,
  anthropic: AI_MODELS.claude,
  claude:    AI_MODELS.claude,
  gemini:    AI_MODELS.gemini,
  google:    AI_MODELS.gemini,
};

/** Resolve the OpenRouter model ID for a given key, with optional runtime override. */
export function resolveOpenRouterModel(
  key: OpenRouterModelKey,
  override?: string | null,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return AI_MODELS[key];
}

// FREE_MODELS kept for any legacy references
export const FREE_MODELS = PRODUCTION_MODELS;
