export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminHasLlmProviders } from "@/lib/ai/admin-providers";
import { validateEnv } from "@/lib/env";

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
  const envCheck = validateEnv();
  const supabaseOk = await checkSupabase();

  const providers = {
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    google: Boolean(
      process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim() ||
        process.env.GOOGLE_AI_API_KEY?.trim(),
    ),
    serper: Boolean(process.env.SERPER_API_KEY?.trim()),
  };

  const canRunPrompts = adminHasLlmProviders();

  const checks = {
    env:            envCheck.ok,
    supabase:       supabaseOk,
    execution_mode: "sync" as const,
    providers,
    can_run_prompts: canRunPrompts,
  };

  const status: "ok" | "degraded" | "error" =
    !envCheck.ok || !supabaseOk
      ? "error"
      : !canRunPrompts
        ? "degraded"
        : "ok";

  return NextResponse.json({
    status,
    checks,
    envErrors:   envCheck.errors.length   ? envCheck.errors   : undefined,
    envWarnings: envCheck.warnings.length ? envCheck.warnings : undefined,
    timestamp: new Date().toISOString(),
  });
}
