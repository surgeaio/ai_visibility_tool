import { serverErrorResponse } from "@/lib/api/errors";
import { hasPublicSupabaseEnv, missingSupabaseResponse } from "@/lib/api/supabase-env";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { UserApiKeysRepository } from "@/lib/repositories";
import { z } from "zod";

export const dynamic = "force-dynamic";

const idParamSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!hasPublicSupabaseEnv()) return missingSupabaseResponse();

  const repo = new UserApiKeysRepository();
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }
  const p = validateParams(params, idParamSchema, requestId);
  if (!p.success) return p.response;
  try {
    const ok = await repo.delete(userId, p.data.id);
    if (!ok) {
      return Response.json({ error: "Not found", requestId }, { status: 404 });
    }
    return Response.json({ ok: true, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to delete API key", requestId);
  }
}
