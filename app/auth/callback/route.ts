import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  } catch {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
