export const dynamic = "force-dynamic";

import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateParams } from "@/lib/api/validate";
import { decryptApiKey } from "@/lib/crypto/encryption";
import { UserApiKeysRepository } from "@/lib/repositories";
import { testUserApiKey } from "@/lib/services/api-key-tester";
import { z } from "zod";

const idParamSchema = z.object({ id: z.string().min(1) });

const repo = new UserApiKeysRepository();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);
  void req;
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }
  const p = validateParams(params, idParamSchema, requestId);
  if (!p.success) return p.response;

  try {
    const keys = await repo.list(userId);
    const meta = keys.find((k) => k.id === p.data.id);
    if (!meta) {
      return Response.json({ error: "Not found", requestId }, { status: 404 });
    }
    const encrypted = await repo.getEncryptedSecret(userId, p.data.id);
    if (!encrypted) {
      return Response.json({ error: "Not found", requestId }, { status: 404 });
    }
    const secret = decryptApiKey(encrypted);
    const result = await testUserApiKey(meta.provider, secret);
    await repo.updateTestStatus(
      userId,
      p.data.id,
      result.ok ? "working" : "failed",
      result.ok ? null : (result.message ?? "Test failed"),
    );
    return Response.json({ ok: result.ok, message: result.message, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to test API key", requestId);
  }
}
