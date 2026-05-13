import { serverErrorResponse } from "@/lib/api/errors";
import { getAuthedUserId } from "@/lib/api/session";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { createUserApiKeySchema } from "@/lib/validators";
import { UserApiKeysRepository } from "@/lib/repositories";
import { testUserApiKey } from "@/lib/services/api-key-tester";

const repo = new UserApiKeysRepository();

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }
  try {
    const keys = await repo.list(userId);
    return Response.json({ keys, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to load API keys", requestId);
  }
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const userId = await getAuthedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized", requestId }, { status: 401 });
  }
  const body = await validateBody(req, createUserApiKeySchema, requestId);
  if (!body.success) return body.response;

  const { provider, keyName, apiKey, testBeforeSave } = body.data;
  if (testBeforeSave) {
    const test = await testUserApiKey(provider, apiKey);
    if (!test.ok) {
      return Response.json(
        { error: test.message ?? "Key test failed", requestId },
        { status: 400 },
      );
    }
  }

  try {
    const created = await repo.create(userId, { provider, keyName, apiKey });
    if (testBeforeSave) {
      await repo.updateTestStatus(userId, created.id, "working", null);
    }
    return Response.json({ key: { ...created, testStatus: testBeforeSave ? "working" : created.testStatus }, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Failed to save API key", requestId);
  }
}
