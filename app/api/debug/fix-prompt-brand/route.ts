import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { promptId?: string; brandId?: string };
  const { promptId, brandId } = body;
  if (!promptId || !brandId) {
    return Response.json({ error: "Missing promptId or brandId" }, { status: 400 });
  }

  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });
  }

  const { error: promptErr } = await supabase
    .from("prompts")
    .update({ brand_id: brandId })
    .eq("id", promptId);

  if (promptErr) {
    return Response.json({ error: promptErr.message }, { status: 500 });
  }

  const { error: lbpErr } = await supabase
    .from("llm_brand_performance")
    .update({ brand_id: brandId })
    .eq("prompt_id", promptId);

  if (lbpErr) {
    console.warn("[fix-prompt-brand] llm_brand_performance update:", lbpErr.message);
  }

  return Response.json({ status: "updated", promptId, brandId });
}
