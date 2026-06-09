/**
 * LLM model configuration for the visibility pipeline.
 *
 * Uses direct provider APIs with these env vars:
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY / GOOGLE_API_KEY / GOOGLE_AI_API_KEY
 */

export const PRODUCTION_MODELS = {
  chatgpt: "gpt-3.5-turbo",
  claude: "claude-3-haiku-20240307",
  gemini: "gemini-1.5-flash",
} as const;

export const AI_MODELS = {
  openai: PRODUCTION_MODELS.chatgpt,
  claude: PRODUCTION_MODELS.claude,
  gemini: PRODUCTION_MODELS.gemini,
} as const;

export type ModelKey = keyof typeof AI_MODELS;

export const VISIBILITY_MODELS: Record<string, string> = {
  chatgpt: AI_MODELS.openai,
  claude: AI_MODELS.claude,
  gemini: AI_MODELS.gemini,
};

/** Models run by default during a visibility check. */
export const DEFAULT_VISIBILITY_MODELS = [
  "chatgpt",
  "claude",
  "gemini",
] as const;

/** Human-readable display names for the dashboard. */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

/** All models available for the UI dropdown. */
export const ALL_AVAILABLE_MODELS: Array<{ slug: string; label: string }> = [
  { slug: "chatgpt", label: "ChatGPT" },
  { slug: "claude", label: "Claude" },
  { slug: "gemini", label: "Gemini" },
];

/** Map provider slugs → direct model IDs. */
export const PROVIDER_MODELS: Record<string, string> = {
  openai: AI_MODELS.openai,
  chatgpt: AI_MODELS.openai,
  anthropic: AI_MODELS.claude,
  claude: AI_MODELS.claude,
  gemini: AI_MODELS.gemini,
  google: AI_MODELS.gemini,
};

/** Resolve the model ID for a given key, with optional runtime override. */
export function resolveModel(
  key: ModelKey,
  override?: string | null,
): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return AI_MODELS[key];
}

/** @deprecated Use resolveModel — kept for backward compatibility. */
export const PROVIDER_TO_OPENROUTER_MODEL = PROVIDER_MODELS;

/** @deprecated Use resolveModel — kept for backward compatibility. */
export function resolveOpenRouterModel(
  key: ModelKey,
  override?: string | null,
): string {
  return resolveModel(key, override);
}

export const FREE_MODELS = PRODUCTION_MODELS;
