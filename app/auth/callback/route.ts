import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(new URL("/login?error=auth_not_configured", url.origin));
  }

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const authError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(authError)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "auth_callback_failed";
    console.error("[auth/callback]", message, e);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
