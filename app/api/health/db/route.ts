export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isAuthBypassMode } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  if (isAuthBypassMode()) {
    const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
    if (!hasUrl) {
      return NextResponse.json({
        status: "skipped",
        reason: "Supabase not configured (demo bypass)",
      });
    }
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("brands").select("id").limit(1);
    if (error) {
      return NextResponse.json({ status: "error", message: error.message }, { status: 503 });
    }
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 503 });
  }
}
