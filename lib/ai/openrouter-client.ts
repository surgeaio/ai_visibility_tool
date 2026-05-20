import OpenAI from "openai";

/**
 * Centralized OpenRouter gateway.
 *
 * OpenRouter exposes an OpenAI-compatible `/chat/completions` endpoint that fronts
 * OpenAI, Anthropic, Google, Mistral, etc. We use the official `openai` SDK with a
 * custom `baseURL` so we get the same chat-completion shape across every provider.
 *
 * Direct provider SDKs (`@anthropic-ai/sdk`, `@google/generative-ai`, raw OpenAI)
 * remain in the codebase as a fallback for legacy `OPENAI_API_KEY` /
 * `ANTHROPIC_API_KEY` / `GOOGLE_AI_API_KEY` envs, but new key configuration should
 * use a single `OPENROUTER_API_KEY`.
 */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const DEFAULT_TITLE = "AI Visibility Tool";

function appReferrer(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

/** Resolve the OpenRouter API key from override or env. */
export function getOpenRouterApiKey(override?: string | null): string | undefined {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  return process.env.OPENROUTER_API_KEY?.trim() || undefined;
}

/** True when an admin-level OpenRouter key is configured via env. */
export function hasOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

/** OpenRouter keys are prefixed with `sk-or-` — used to detect per-user keys. */
export function isOpenRouterKey(key?: string | null): boolean {
  return Boolean(key && key.trim().startsWith("sk-or-"));
}

/**
 * Build an OpenAI-SDK client pointed at OpenRouter. Returns `null` when no key is
 * available so callers can fall through to a direct-provider SDK.
 */
export function createOpenRouterClient(
  override?: string | null,
  timeoutMs?: number,
): OpenAI | null {
  const apiKey = getOpenRouterApiKey(override);
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    timeout: timeoutMs ?? 60_000,
    defaultHeaders: {
      "HTTP-Referer": appReferrer(),
      "X-Title": DEFAULT_TITLE,
    },
  });
}

/**
 * Shared singleton (admin key only). Prefer `createOpenRouterClient(userKey)` when
 * forwarding a per-user key.
 */
export const openrouter = createOpenRouterClient();
