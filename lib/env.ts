/**
 * Centralized environment variable validator.
 *
 * Call `validateEnv()` at the top of long-running server processes or
 * in a startup health-check route to surface missing configuration early.
 *
 * Usage:
 *   import { validateEnv } from "@/lib/env";
 *   const { ok, warnings, errors } = validateEnv();
 *   if (!ok) console.error("Env validation failed:", errors);
 */

export interface EnvValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── Required: Supabase ───────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is not set (required for admin operations)");
  }

  // ─── Required: AI — at minimum one gateway ────────────────────────────────
  const hasOpenRouter  = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const hasDirectOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasDirectAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasDirectGemini = Boolean(
    process.env.GOOGLE_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim(),
  );

  if (!hasOpenRouter) {
    if (!hasDirectOpenAI && !hasDirectAnthropic && !hasDirectGemini) {
      errors.push(
        "No AI gateway configured. Set OPENROUTER_API_KEY (recommended) or at least one of OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY.",
      );
    } else {
      warnings.push(
        "OPENROUTER_API_KEY is not set. Falling back to direct provider keys. " +
        "This means some models may be unavailable. Add OPENROUTER_API_KEY for full coverage.",
      );
    }
  }

  // ─── Optional but recommended ─────────────────────────────────────────────
  if (!process.env.ENCRYPTION_KEY?.trim()) {
    warnings.push("ENCRYPTION_KEY is not set — per-user API key encryption is disabled.");
  }

  if (!process.env.CRON_SECRET?.trim()) {
    warnings.push("CRON_SECRET is not set — cron jobs will not be protected.");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL?.trim() && !process.env.APP_URL?.trim()) {
    warnings.push("NEXT_PUBLIC_APP_URL is not set — OpenRouter HTTP-Referer header will default to localhost:3000.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/** Log validation result to the console at startup. */
export function logEnvValidation(): void {
  const { ok, errors, warnings } = validateEnv();
  if (!ok) {
    console.error("[env] ❌ Environment validation FAILED:");
    errors.forEach((e) => console.error("  ✗", e));
  } else {
    console.log("[env] ✅ Required environment variables present.");
  }
  if (warnings.length) {
    warnings.forEach((w) => console.warn("[env] ⚠", w));
  }
}
