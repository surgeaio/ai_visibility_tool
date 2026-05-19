export const dynamic = "force-dynamic";

import { analyzeSentiment } from "@/lib/ai/sentiment";
import { serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { analyzeSentimentSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const bodyValidation = await validateBody(req, analyzeSentimentSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const { text, brandName } = bodyValidation.data;
    const result = await analyzeSentiment(text, brandName);
    return Response.json({ ...result, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Sentiment analysis failed", requestId);
  }
}
