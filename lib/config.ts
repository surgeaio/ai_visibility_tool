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

/** True when auth enforcement should be skipped (explicit demo flag or Supabase not configured). */
export function isAuthBypassMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return true;
  return false;
}
