export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminHasLlmProviders } from "@/lib/ai/admin-providers";

function checkEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const envOk = checkEnv();
  const supabaseOk = await checkSupabase();

  const openRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const providers = {
    openrouter: openRouter,
    openai: openRouter || Boolean(process.env.OPENAI_API_KEY?.trim()),
    anthropic: openRouter || Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    google: openRouter || Boolean(process.env.GOOGLE_AI_API_KEY?.trim()),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY?.trim()),
    serper: Boolean(process.env.SERPER_API_KEY?.trim()),
  };

  const canRunPrompts = adminHasLlmProviders();
  const executionMode = "sync";

  const checks = {
    env: envOk,
    supabase: supabaseOk,
    execution_mode: executionMode,
    providers,
    can_run_prompts: canRunPrompts,
  };

  const status = envOk && supabaseOk && canRunPrompts ? "ok" : "degraded";

  return NextResponse.json({
    status,
    checks,
    timestamp: new Date().toISOString(),
  });
}
