export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function hasAnthropic() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Demo mode: no API keys — UI uses seeded data; APIs return mock analysis when keys missing */
export function isDemoMode() {
  return !hasOpenAI() && !hasAnthropic();
}

/**
 * When true, LLM providers must not return synthetic "Demo … response" text; callers get a thrown error if keys are missing.
 * Set in production stacks where accidental simulation is unacceptable. Default false preserves local dev without keys.
 */
export function isStrictLlmExecution(): boolean {
  const v = process.env.STRICT_LLM_EXECUTION?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** True when auth enforcement should be skipped (explicit demo flag or Supabase not configured). */
export function isAuthBypassMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return true;
  return false;
}
