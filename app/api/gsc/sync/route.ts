import { z } from "zod";
import { getAuthedUserId } from "@/lib/api/session";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { syncGscData } from "@/lib/services/gsc/sync";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const bodySchema = z.object({
  brandId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const cronAuthed = authorizeCron(req);

  let userId: string | null = null;
  if (!cronAuthed) {
    userId = await getAuthedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
    }
  }

  let body: z.infer<typeof bodySchema> = {};
  const parsed = await validateBody(req, bodySchema, requestId);
  if (parsed.success) {
    body = parsed.data;
  } else if (!cronAuthed) {
    return parsed.response;
  }

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    return Response.json({ error: "Database not configured", requestId }, { status: 503 });
  }

  let query = admin.from("gsc_connections").select("id, brand_id").eq("is_active", true);

  if (body.brandId) {
    query = query.eq("brand_id", body.brandId);
  } else if (body.userId ?? userId) {
    query = query.eq("user_id", body.userId ?? userId!);
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: connections, error } = await query;
  if (error) return serverErrorResponse(error.message, requestId);

  if (!connections?.length) {
    return Response.json(
      { error: "No active GSC connections", code: "NOT_CONNECTED", requestId },
      { status: 404 },
    );
  }

  const results: Array<{ connectionId: string; status: string; dailyRows?: number; queryRows?: number; error?: string }> = [];

  for (const conn of connections) {
    try {
      const result = await syncGscData({ connectionId: conn.id });
      results.push({ connectionId: conn.id, status: "ok", ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "sync failed";
      console.error(`[gsc-sync] connection ${conn.id} failed:`, err);
      results.push({ connectionId: conn.id, status: "failed", error: message });
    }
  }

  return Response.json({ results, requestId });
}
