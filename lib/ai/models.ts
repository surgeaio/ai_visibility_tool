/**
 * OpenRouter model IDs used across the visibility pipeline.
 *
 * Free models (`:free` suffix) require no OpenRouter credits and are used by default
 * so the dashboard works immediately after adding OPENROUTER_API_KEY.
 * Swap the IDs below to paid variants once you add credits.
 */

// ---------------------------------------------------------------------------
// Free models — used by default (no credits required)
// ---------------------------------------------------------------------------
export const FREE_MODELS = {
  chatgpt:    "meta-llama/llama-4-maverick:free",                    // High-quality free alternative for the ChatGPT slot
  claude:     "deepseek/deepseek-chat-v3-0324:free",                 // High-quality free alternative for the Claude slot
  gemini:     "google/gemini-2.0-flash-exp:free",                    // Real Gemini, free tier
  perplexity: "mistralai/mistral-small-3.2-24b-instruct:free",       // Free when no Perplexity key
  llama:      "meta-llama/llama-4-scout:free",
  deepseek:   "deepseek/deepseek-r1-0528:free",
  mistral:    "mistralai/mistral-small-3.2-24b-instruct:free",
  qwen:       "qwen/qwen3-235b-a22b:free",
} as const;

// ---------------------------------------------------------------------------
// Paid / production models — swap to these once you add OpenRouter credits
// ---------------------------------------------------------------------------
export const PRODUCTION_MODELS = {
  chatgpt:    "openai/gpt-4o-mini",
  claude:     "anthropic/claude-sonnet-4",
  gemini:     "google/gemini-2.5-flash-preview",
  perplexity: "perplexity/llama-3.1-sonar-large-128k-online",
  llama:      "meta-llama/llama-4-scout",
  deepseek:   "deepseek/deepseek-chat-v3-0324",
  mistral:    "mistralai/mistral-small-3.2-24b-instruct",
} as const;

// ---------------------------------------------------------------------------
// VISIBILITY_MODELS — what the visibility pipeline actually runs
// Maps DB slug ("chatgpt"|"claude"|"gemini"|"perplexity") → OpenRouter model ID
//
// All slots default to FREE models so the app works with zero credits.
// Override individual slots via env:
//   OPENROUTER_MODEL_CHATGPT=openai/gpt-4o-mini
//   OPENROUTER_MODEL_CLAUDE=anthropic/claude-sonnet-4
//   OPENROUTER_MODEL_GEMINI=google/gemini-2.5-flash-preview
//   OPENROUTER_MODEL_PERPLEXITY=perplexity/llama-3.1-sonar-large-128k-online
// ---------------------------------------------------------------------------
export const VISIBILITY_MODELS: Record<string, string> = {
  chatgpt:    process.env.OPENROUTER_MODEL_CHATGPT    || FREE_MODELS.chatgpt,
  claude:     process.env.OPENROUTER_MODEL_CLAUDE     || FREE_MODELS.claude,
  gemini:     process.env.OPENROUTER_MODEL_GEMINI     || FREE_MODELS.gemini,
  perplexity: process.env.OPENROUTER_MODEL_PERPLEXITY || FREE_MODELS.perplexity,
};

/** Models run by default during a visibility check. These slugs must match DB check constraint. */
export const DEFAULT_VISIBILITY_MODELS = ["chatgpt", "claude", "gemini", "perplexity"] as const;

/** Human-readable display names for the dashboard. */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  chatgpt:    "ChatGPT",
  claude:     "Claude",
  gemini:     "Gemini",
  perplexity: "Perplexity",
  llama:      "Llama 4",
  deepseek:   "DeepSeek",
  mistral:    "Mistral",
  qwen:       "Qwen",
};

// ---------------------------------------------------------------------------
// AI_MODELS — used by provider classes (OpenAI/Anthropic/Gemini) and
// analysis helpers (response-analyzer, recommendations, sentiment).
// Also defaults to free models so those paths work without credits.
// ---------------------------------------------------------------------------
export const AI_MODELS = {
  openai: process.env.OPENROUTER_MODEL_CHATGPT    || FREE_MODELS.chatgpt,
  claude: process.env.OPENROUTER_MODEL_CLAUDE     || FREE_MODELS.claude,
  gemini: process.env.OPENROUTER_MODEL_GEMINI     || FREE_MODELS.gemini,
} as const;

export type OpenRouterModelKey = keyof typeof AI_MODELS;

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
