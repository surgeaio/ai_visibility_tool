/**
 * Universal AI executor — routes all calls through OpenRouter.
 *
 * Never throws. Returns { success: true, text } or { success: false, error }.
 * Applies a 45-second timeout on every request.
 * If one model fails the caller can continue with the remaining models.
 */
import { createOpenRouterClient } from "./openrouter-client";
import { AI_MODELS } from "./models";

export type RunModelKey = keyof typeof AI_MODELS;

export interface RunModelSuccess {
  success: true;
  text: string;
  model: string;
}

export interface RunModelFailure {
  success: false;
  error: string;
  model: string;
}

export type RunModelResult = RunModelSuccess | RunModelFailure;

const TIMEOUT_MS = 45_000;

/**
 * Run a single prompt on one OpenRouter-backed model.
 * Never throws — failures are captured in the return value.
 */
export async function runModel(
  modelKey: RunModelKey,
  prompt: string,
  systemPrompt?: string,
): Promise<RunModelResult> {
  const modelId = AI_MODELS[modelKey];
  try {
    const client = createOpenRouterClient(null, TIMEOUT_MS);
    if (!client) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.",
      );
    }

    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        ...(systemPrompt
          ? [{ role: "system" as const, content: systemPrompt }]
          : []),
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      throw new Error(`Empty response from ${modelKey} (${modelId})`);
    }

    console.log(`[run-model] ${modelKey} OK (${text.length} chars)`);
    return { success: true, text, model: modelId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[run-model] ${modelKey} FAILED:`, message);
    return { success: false, error: message, model: modelId };
  }
}

/**
 * Run a prompt across multiple models in parallel.
 * Each failure is isolated — remaining models continue running.
 */
export async function runMultipleModels(
  modelKeys: RunModelKey[],
  prompt: string,
  systemPrompt?: string,
): Promise<RunModelResult[]> {
  const settled = await Promise.allSettled(
    modelKeys.map((key) => runModel(key, prompt, systemPrompt)),
  );
  return settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      success: false,
      error: r.reason instanceof Error ? r.reason.message : "Promise rejected",
      model: AI_MODELS[modelKeys[i]],
    } satisfies RunModelFailure;
  });
}
