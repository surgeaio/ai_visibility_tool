export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  buildBrandNameVariations,
  detectBrandMention,
} from "@/lib/services/brand-mention-detector";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const secret = req.headers.get("x-debug-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json({ error: "brandId required" }, { status: 400 });
  }

  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });
  }

  const { data: brand, error: brandErr } = await supabase
    .from("brands")
    .select("id, name, domain, website, aliases")
    .eq("id", brandId)
    .single();

  if (brandErr || !brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const ownBrand = {
    name: brand.name,
    domain: brand.domain ?? brand.website,
    website: brand.website,
    aliases: brand.aliases ?? [],
  };

  const variations = buildBrandNameVariations(ownBrand);

  const { data: responses } = await supabase
    .from("chat_responses")
    .select("id, ai_model, response_text, created_at")
    .eq("brand_id", brandId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(10);

  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: analyses } = responseIds.length
    ? await supabase
        .from("chat_analysis")
        .select("chat_response_id, brand_mentioned, brand_position, brand_sentiment")
        .in("chat_response_id", responseIds)
    : { data: [] };

  const analysisByResponse = new Map(
    (analyses ?? []).map((a) => [a.chat_response_id as string, a]),
  );

  const detectionCheck = (responses ?? []).map((row) => {
    const text = row.response_text ?? "";
    const analysis = analysisByResponse.get(row.id);
    const local = detectBrandMention(text, ownBrand);
    const lower = text.toLowerCase();

    return {
      id: row.id,
      model: row.ai_model,
      brand_mentioned_flag: analysis?.brand_mentioned ?? null,
      local_detection_mentioned: local.mentioned,
      local_detection_position: local.position,
      contains_any_variation: variations.some((v) => lower.includes(v)),
      variations_checked: variations,
      response_preview: text.slice(0, 300),
    };
  });

  const mentionedInDb = detectionCheck.filter((r) => r.brand_mentioned_flag === true).length;
  const localMentioned = detectionCheck.filter((r) => r.local_detection_mentioned).length;
  const textContains = detectionCheck.filter((r) => r.contains_any_variation).length;

  return NextResponse.json({
    brand: ownBrand,
    nameVariations: variations,
    detectionCheck,
    summary: {
      rowsChecked: detectionCheck.length,
      mentionedInDb,
      localMentioned,
      textContainsVariation: textContains,
      mismatchCount: detectionCheck.filter(
        (r) => r.local_detection_mentioned && !r.brand_mentioned_flag,
      ).length,
    },
  });
}
