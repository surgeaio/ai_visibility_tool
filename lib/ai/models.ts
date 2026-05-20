/**
 * OpenRouter model IDs used across the visibility pipeline.
 *
 * Free models (`:free` suffix) require no OpenRouter credits and are used by default
 * so the dashboard works immediately after adding OPENROUTER_API_KEY.
 * Swap the IDs below to paid variants once you add credits.
 *
 * Confirmed working free models — May 2026:
 *   meta-llama/llama-3.1-8b-instruct:free
 *   meta-llama/llama-3.3-70b-instruct:free
 *   deepseek/deepseek-r1:free
 *   mistralai/mistral-7b-instruct:free
 *   microsoft/phi-4:free
 *   qwen/qwen-2.5-7b-instruct:free
 */

// ---------------------------------------------------------------------------
// Free models — confirmed working on OpenRouter (no credits needed)
// ---------------------------------------------------------------------------
export const FREE_MODELS = {
  llama:      "meta-llama/llama-3.1-8b-instruct:free",    // confirmed free ✅
  deepseek:   "deepseek/deepseek-r1:free",                 // confirmed free ✅
  mistral:    "mistralai/mistral-7b-instruct:free",         // confirmed free ✅
  // legacy slug aliases → free replacements
  chatgpt:    "meta-llama/llama-3.3-70b-instruct:free",    // confirmed free ✅
  claude:     "deepseek/deepseek-r1:free",                  // confirmed free ✅
  gemini:     "meta-llama/llama-3.1-8b-instruct:free",     // confirmed free ✅
  perplexity: "mistralai/mistral-7b-instruct:free",         // confirmed free ✅
  qwen:       "qwen/qwen-2.5-7b-instruct:free",            // confirmed free ✅
} as const;

// ---------------------------------------------------------------------------
// Paid / production models — swap to these once you add OpenRouter credits
// ---------------------------------------------------------------------------
export const PRODUCTION_MODELS = {
  chatgpt:    "openai/gpt-4o-mini",
  claude:     "anthropic/claude-3-haiku",
  gemini:     "google/gemini-2.0-flash-001",
  perplexity: "perplexity/llama-3.1-sonar-small-128k-online",
  llama:      "meta-llama/llama-4-scout",
  deepseek:   "deepseek/deepseek-chat-v3-0324",
  mistral:    "mistralai/mistral-small-3.2-24b-instruct",
} as const;

// ---------------------------------------------------------------------------
// VISIBILITY_MODELS — what the visibility pipeline actually runs.
// Maps DB slug → OpenRouter model ID.
//
// All slots default to FREE models so the app works with zero credits.
// Override individual slots via env:
//   OPENROUTER_MODEL_CHATGPT=openai/gpt-4o-mini
//   OPENROUTER_MODEL_CLAUDE=anthropic/claude-3-haiku
//   OPENROUTER_MODEL_GEMINI=google/gemini-2.0-flash-001
//   OPENROUTER_MODEL_PERPLEXITY=perplexity/llama-3.1-sonar-small-128k-online
// ---------------------------------------------------------------------------
export const VISIBILITY_MODELS: Record<string, string> = {
  // Primary free slots — used by DEFAULT_VISIBILITY_MODELS
  llama:      process.env.OPENROUTER_MODEL_LLAMA      || FREE_MODELS.llama,
  deepseek:   process.env.OPENROUTER_MODEL_DEEPSEEK   || FREE_MODELS.deepseek,
  mistral:    process.env.OPENROUTER_MODEL_MISTRAL    || FREE_MODELS.mistral,
  // Legacy slots kept for backward-compat (paid overrideable)
  chatgpt:    process.env.OPENROUTER_MODEL_CHATGPT    || FREE_MODELS.chatgpt,
  claude:     process.env.OPENROUTER_MODEL_CLAUDE     || FREE_MODELS.claude,
  gemini:     process.env.OPENROUTER_MODEL_GEMINI     || FREE_MODELS.gemini,
  perplexity: process.env.OPENROUTER_MODEL_PERPLEXITY || FREE_MODELS.perplexity,
  qwen:       FREE_MODELS.qwen,
};

/**
 * Models run by default during a visibility check.
 * All are FREE — no OpenRouter credits required.
 */
export const DEFAULT_VISIBILITY_MODELS = [
  "llama",      // meta-llama/llama-3.1-8b-instruct:free  ✅ FREE
  "deepseek",   // deepseek/deepseek-r1:free               ✅ FREE
  "mistral",    // mistralai/mistral-7b-instruct:free       ✅ FREE
] as const;

/** Human-readable display names for the dashboard. */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  llama:      "Llama 3.1",
  deepseek:   "DeepSeek R1",
  mistral:    "Mistral 7B",
  chatgpt:    "ChatGPT",
  claude:     "Claude",
  gemini:     "Gemini",
  perplexity: "Perplexity",
  qwen:       "Qwen",
};

/** All models available for the UI dropdown. */
export const ALL_AVAILABLE_MODELS: Array<{ slug: string; label: string; free: boolean }> = [
  { slug: "llama",      label: "Llama 3.1",   free: true  },
  { slug: "deepseek",   label: "DeepSeek R1", free: true  },
  { slug: "mistral",    label: "Mistral 7B",  free: true  },
  { slug: "chatgpt",    label: "ChatGPT",     free: false },
  { slug: "claude",     label: "Claude",      free: false },
  { slug: "gemini",     label: "Gemini",      free: false },
  { slug: "perplexity", label: "Perplexity",  free: false },
];

// ---------------------------------------------------------------------------
// AI_MODELS — used by provider classes (OpenAI/Anthropic/Gemini) and
// analysis helpers (response-analyzer, recommendations, sentiment).
// Defaults to free models so those paths work without credits.
// ---------------------------------------------------------------------------
export const AI_MODELS = {
  openai:  process.env.OPENROUTER_MODEL_CHATGPT    || FREE_MODELS.chatgpt,
  claude:  process.env.OPENROUTER_MODEL_CLAUDE     || FREE_MODELS.claude,
  gemini:  process.env.OPENROUTER_MODEL_GEMINI     || FREE_MODELS.gemini,
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
