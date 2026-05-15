import { analyzePromptOrDemo } from "@/lib/ai/analyzer";
import type { AIModelKey, ProviderName } from "@/lib/ai/types";
import { rateLimitResponse, serverErrorResponse } from "@/lib/api/errors";
import { getRequestId, validateBody } from "@/lib/api/validate";
import { rateLimit } from "@/lib/rate-limit";
import { analyzePromptRequestSchema } from "@/lib/validators";
import { ResultsRepository } from "@/lib/repositories";
import { executePromptAcrossModels } from "@/lib/ai/orchestrator";

const SUPPORTED_MODELS: AIModelKey[] = ["openai", "anthropic"];
const resultsRepo = new ResultsRepository();

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await rateLimit(`analyze:${ip}`);
  if (!rl.ok) {
    return rateLimitResponse(requestId);
  }

  const bodyValidation = await validateBody(req, analyzePromptRequestSchema, requestId);
  if (!bodyValidation.success) return bodyValidation.response;

  try {
    const { prompt, brandName, competitors, models, promptId, brandId } = bodyValidation.data;
    const providerModels = models as ProviderName[];
    const orchestration = await executePromptAcrossModels({
      prompt,
      requestId,
      providers: providerModels,
    });

    const supportedModels = models.filter((model): model is AIModelKey =>
      SUPPORTED_MODELS.includes(model as AIModelKey),
    );
    const finalModels = supportedModels.length > 0 ? supportedModels : SUPPORTED_MODELS;

    const result = await analyzePromptOrDemo({
      prompt,
      brandName,
      competitors,
      models: finalModels,
    });
    if (promptId && brandId) {
      await Promise.all(
        result.perModel.map((item) =>
          resultsRepo.create({
            promptId,
            brandId,
            model: item.model,
            responseText: item.response,
            visibility: item.visibility,
            position: item.position,
            sentiment: item.sentiment.sentiment,
            sentimentScore: item.sentiment.score,
            confidence: item.sentiment.confidence,
            positiveSignals: item.sentiment.positiveSignals,
            negativeSignals: item.sentiment.negativeSignals,
            keywords: item.sentiment.keywords,
          }),
        ),
      );
    }
    return Response.json({ ...result, orchestration, requestId });
  } catch (error) {
    console.error(error);
    return serverErrorResponse("Analysis failed", requestId);
  }
}
