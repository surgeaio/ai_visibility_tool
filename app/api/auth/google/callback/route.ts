export const dynamic = "force-dynamic";

import { handleGoogleGscOAuthCallback } from "@/lib/auth/google-gsc-callback";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Legacy callback path — same handler as /api/auth/callback/google */
export async function GET(req: NextRequest) {
  return handleGoogleGscOAuthCallback(req);
}
