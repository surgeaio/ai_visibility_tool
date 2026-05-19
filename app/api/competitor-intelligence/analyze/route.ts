import { NextRequest } from "next/server";
import { getAuthedUserId } from "@/lib/api/session";
import { verifyBrandOwnedByUser } from "@/lib/services/competitors/access";
import { detectCompetitors } from "@/lib/services/competitors/detect";
import { generateCompetitorAnalysis } from "@/lib/services/competitors/analyze";
import { syncCompetitorRankings } from "@/lib/services/competitors/sync-rankings";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getAuthedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let brandId: string | undefined;
  try {
    const body = (await req.json()) as { brandId?: string };
    brandId = body.brandId;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!brandId) return Response.json({ error: "brandId required" }, { status: 400 });

  const brand = await verifyBrandOwnedByUser(brandId, userId);
  if (!brand) return Response.json({ error: "Brand not found" }, { status: 404 });

  try {
    const detection = await detectCompetitors(brandId);
    const rankings = await syncCompetitorRankings(brandId);
    const analysis = await generateCompetitorAnalysis(brandId);

    return Response.json({
      status: "completed",
      detection,
      rankings,
      analysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[competitor-intelligence/analyze] failed:", err);
    return Response.json({ error: message, code: "ANALYSIS_ERROR" }, { status: 500 });
  }
}
