import { GoogleOAuthService } from "@/lib/services/google-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId?.trim()) {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }
  let authUrl: string;
  try {
    const state = Buffer.from(JSON.stringify({ brandId }), "utf8").toString("base64url");
    authUrl = new GoogleOAuthService().getAuthUrl(state);
  } catch {
    return NextResponse.json(
      { error: "Google OAuth is not configured (missing client id/secret)." },
      { status: 503 },
    );
  }
  return NextResponse.redirect(authUrl);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { brandId?: string } | null;
  const brandId = body?.brandId;
  if (!brandId?.trim()) {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }
  try {
    const state = Buffer.from(JSON.stringify({ brandId }), "utf8").toString("base64url");
    const authUrl = new GoogleOAuthService().getAuthUrl(state);
    return NextResponse.json({ authUrl });
  } catch {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }
}
