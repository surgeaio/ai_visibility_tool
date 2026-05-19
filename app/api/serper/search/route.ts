export const dynamic = "force-dynamic";

import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse, rateLimitResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { rateLimit } from "@/lib/rate-limit";
import { serperSearchBodySchema } from "@/lib/validators";
import { serperSearch, summarizeSerpFeatures } from "@/lib/services/serper";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }

  const rl = await rateLimit(`serper-search:${userId}`);
  if (!rl.ok) {
    return rateLimitResponse(requestId);
  }

  const parsed = await validateBody(req, serperSearchBodySchema, requestId);
  if (!parsed.success) return parsed.response;

  try {
    const raw = await serperSearch(parsed.data);
    const serpFeatures = summarizeSerpFeatures(raw);
    return Response.json({
      query: parsed.data.q,
      serpFeatures,
      organic: raw.organic ?? [],
      topLevelKeys: Object.keys(raw),
      requestId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Serper request failed";
    if (message.includes("SERPER_API_KEY")) {
      return Response.json({ error: message, requestId }, { status: 503 });
    }
    console.error(e);
    return serverErrorResponse(message, requestId);
  }
}
