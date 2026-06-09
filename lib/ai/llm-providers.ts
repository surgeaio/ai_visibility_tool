/**
 * Unified LLM dispatcher for the visibility pipeline.
 * Uses direct provider APIs only (no OpenRouter).
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PRODUCTION_MODELS } from "@/lib/ai/models";

export type LLMPlatform = "chatgpt" | "claude" | "gemini";

export const ENABLED_PLATFORMS: LLMPlatform[] = [
  "chatgpt",
  "claude",
  "gemini",
];

export const PLATFORM_LABELS: Record<LLMPlatform, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

export const PLATFORM_MODELS: Record<LLMPlatform, string> = {
  chatgpt: PRODUCTION_MODELS.chatgpt,
  claude: PRODUCTION_MODELS.claude,
  gemini: PRODUCTION_MODELS.gemini,
};

export interface LLMSuccess {
  platform: LLMPlatform;
  model: string;
  text: string;
  sources: Array<{ url: string }>;
  tokensUsed?: number;
  ok: true;
}

export interface LLMFailure {
  platform: LLMPlatform;
  model: string;
  error: string;
  ok: false;
}

export type LLMResult = LLMSuccess | LLMFailure;

const SYSTEM_PROMPT =
  "You are a helpful assistant. When asked about products or services, list specific brand names with brief descriptions.";

const TIMEOUT_MS = 45_000;

function resolveGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim()
  );
}

export async function callLLM(
  platform: LLMPlatform,
  prompt: string,
): Promise<LLMResult> {
  try {
    switch (platform) {
      case "chatgpt": {
        const key = process.env.OPENAI_API_KEY?.trim();
        if (!key) {
          throw new Error(
            "OPENAI_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.",
          );
        }
        const model = PLATFORM_MODELS.chatgpt;
        const client = new OpenAI({
          apiKey: key,
          baseURL: "https://api.openai.com/v1",
          timeout: TIMEOUT_MS,
        });
        const res = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          max_tokens: 1200,
          temperature: 0.3,
        });
        const text = res.choices[0]?.message?.content ?? "";
        const tokensUsed = res.usage?.total_tokens;
        console.log(`[llm-providers] chatgpt direct OK (${text.length} chars)`);
        return { platform, model, text, sources: [], tokensUsed, ok: true };
      }

      case "claude": {
        const key = process.env.ANTHROPIC_API_KEY?.trim();
        if (!key) {
          throw new Error(
            "ANTHROPIC_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.",
          );
        }
        const model = PLATFORM_MODELS.claude;
        const client = new Anthropic({
          apiKey: key,
          baseURL: "https://api.anthropic.com",
          timeout: TIMEOUT_MS,
        });
        const res = await client.messages.create({
          model,
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });
        const text = res.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("\n");
        const tokensUsed = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0);
        console.log(`[llm-providers] claude direct OK (${text.length} chars)`);
        return { platform, model, text, sources: [], tokensUsed, ok: true };
      }

      case "gemini": {
        const key = resolveGeminiApiKey();
        if (!key) {
          throw new Error(
            "GEMINI_API_KEY or GOOGLE_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables.",
          );
        }
        const model = PLATFORM_MODELS.gemini;
        const genAI = new GoogleGenerativeAI(key);
        const m = genAI.getGenerativeModel({
          model,
          systemInstruction: SYSTEM_PROMPT,
        });
        const result = await m.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.3 },
        });
        const text = result.response.text();
        const usage = result.response.usageMetadata;
        const tokensUsed =
          (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);
        console.log(`[llm-providers] gemini direct OK (${text.length} chars)`);
        return { platform, model, text, sources: [], tokensUsed, ok: true };
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[llm-providers] ${platform} FAILED:`, error);
    return { platform, model: PLATFORM_MODELS[platform], error, ok: false };
  }
}

export function getAvailablePlatforms(
  requested: LLMPlatform[] = ENABLED_PLATFORMS,
): LLMPlatform[] {
  return requested.filter((p) => {
    switch (p) {
      case "chatgpt":
        return Boolean(process.env.OPENAI_API_KEY?.trim());
      case "claude":
        return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
      case "gemini":
        return Boolean(resolveGeminiApiKey());
    }
  });
}

/** Run a prompt on multiple platforms in parallel. Never throws. */
export async function callMultiplePlatforms(
  platforms: LLMPlatform[],
  prompt: string,
): Promise<LLMResult[]> {
  const settled = await Promise.allSettled(
    platforms.map((p) => callLLM(p, prompt)),
  );
  return settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      platform: platforms[i],
      model: PLATFORM_MODELS[platforms[i]],
      error: r.reason instanceof Error ? r.reason.message : "Promise rejected",
      ok: false,
    } satisfies LLMFailure;
  });
}
