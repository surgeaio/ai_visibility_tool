import { LLM_KEY_TO_PLATFORM_SLUG, type LlmKeyProviderName } from "@/lib/ai/llm-provider-factory";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

const PLATFORM_DISPLAY: Record<string, string> = {
  chatgpt:    "ChatGPT",
  claude:     "Claude",
  gemini:     "Gemini",
  perplexity: "Perplexity",
  // Free OpenRouter-only models
  llama:      "Llama 3.1",
  deepseek:   "DeepSeek R1",
  mistral:    "Mistral 7B",
};

/** Extra model slugs that aren't in LLM_KEY_TO_PLATFORM_SLUG but need platform rows. */
const EXTRA_MODEL_SLUGS = ["llama", "deepseek", "mistral"] as const;

/** Ensure llm_platforms rows exist (idempotent). */
export async function ensureLlmPlatformsSeeded(): Promise<void> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    console.warn("[llm-platforms] skip seed: no service role client");
    return;
  }

  const slugs = [
    ...Object.values(LLM_KEY_TO_PLATFORM_SLUG),
    ...EXTRA_MODEL_SLUGS,
  ];

  for (const name of slugs) {
    const { data: existing } = await admin.from("llm_platforms").select("id").eq("name", name).maybeSingle();
    if (existing) continue;

    const { error } = await admin.from("llm_platforms").insert({
      name,
      display_name: PLATFORM_DISPLAY[name] ?? name,
      is_active: true,
    });
    if (error) {
      console.error(`[llm-platforms] seed insert ${name}:`, error.message);
    } else {
      console.log(`[llm-platforms] seeded platform: ${name}`);
    }
  }
}

export async function resolvePlatformIdForProvider(
  provider: LlmKeyProviderName,
): Promise<string> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — cannot persist LLM results");
  }

  const platformName = LLM_KEY_TO_PLATFORM_SLUG[provider];
  const { data, error } = await admin
    .from("llm_platforms")
    .select("id")
    .eq("name", platformName)
    .maybeSingle();

  if (error) {
    throw new Error(`Platform lookup failed for ${provider}: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(
      `No llm_platforms row for "${platformName}" (provider ${provider}). Run migrations or check seed.`,
    );
  }
  return data.id as string;
}

/**
 * Resolve a platform ID by model slug directly (for OpenRouter-only models
 * like llama/deepseek/mistral that have no dedicated LlmKeyProviderName).
 * Returns null when no platform row exists.
 */
export async function resolvePlatformIdBySlug(slug: string): Promise<string | null> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return null;

  const { data } = await admin
    .from("llm_platforms")
    .select("id")
    .eq("name", slug)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}
