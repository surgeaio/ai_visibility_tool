/**
 * Unified LLM dispatcher for the visibility pipeline.
 *
 * Execution priority:
 *   1. OpenRouter (OPENROUTER_API_KEY) — single key for ChatGPT, Claude, Gemini
 *   2. Direct provider SDK — fallback when OPENROUTER_API_KEY is absent
 */
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OPENROUTER_BASE_URL } from "@/lib/ai/openrouter-client";

export type LLMPlatform = "chatgpt" | "claude" | "gemini";

export const ENABLED_PLATFORMS: LLMPlatform[] = [
  "chatgpt",
  "claude",
  "gemini",
];

export const PLATFORM_LABELS: Record<LLMPlatform, string> = {
  chatgpt:    "ChatGPT",
  claude:     "Claude",
  gemini:     "Gemini",
};

/** Bare model names used for direct provider SDK calls (fallback path). */
export const PLATFORM_MODELS: Record<LLMPlatform, string> = {
  chatgpt:    "gpt-4o-mini",
  claude:     "claude-haiku-4-5",
  gemini:     "gemini-2.5-flash",
};

/** OpenRouter model IDs (provider-prefixed) for the primary execution path. */
const OPENROUTER_PLATFORM_MODELS: Record<LLMPlatform, string> = {
  chatgpt: "openai/gpt-4o-mini",
  claude:  "anthropic/claude-sonnet-4",
  gemini:  "google/gemini-2.5-flash",
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

function buildOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    timeout: TIMEOUT_MS,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000",
      "X-Title": "AI Visibility Tool",
    },
  });
}

export async function callLLM(
  platform: LLMPlatform,
  prompt: string,
): Promise<LLMResult> {
  try {
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

    if (openrouterKey) {
      const openrouterModel = OPENROUTER_PLATFORM_MODELS[platform];
      const client = buildOpenRouterClient(openrouterKey);
      const res = await client.chat.completions.create({
        model: openrouterModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.3,
      });
      const text = res.choices[0]?.message?.content ?? "";
      const tokensUsed = res.usage?.total_tokens;
      console.log(`[llm-providers] ${platform} via OpenRouter OK (${text.length} chars)`);
      return { platform, model: openrouterModel, text, sources: [], tokensUsed, ok: true };
    }

    // Direct provider SDK fallback
    switch (platform) {
      case "chatgpt": {
        const key = process.env.OPENAI_API_KEY?.trim();
        if (!key) {
          throw new Error(
            "No OPENROUTER_API_KEY or OPENAI_API_KEY configured. Add OPENROUTER_API_KEY in Vercel → Settings → Environment Variables.",
          );
        }
        const model = PLATFORM_MODELS.chatgpt;
        const client = new OpenAI({ apiKey: key, timeout: TIMEOUT_MS });
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
            "No OPENROUTER_API_KEY or ANTHROPIC_API_KEY configured. Add OPENROUTER_API_KEY in Vercel → Settings → Environment Variables.",
          );
        }
        const model = PLATFORM_MODELS.claude;
        const client = new Anthropic({ apiKey: key, timeout: TIMEOUT_MS });
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
        const key =
          process.env.GOOGLE_API_KEY?.trim() ||
          process.env.GOOGLE_AI_API_KEY?.trim();
        if (!key) {
          throw new Error(
            "No OPENROUTER_API_KEY or GOOGLE_API_KEY configured. Add OPENROUTER_API_KEY in Vercel → Settings → Environment Variables.",
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

/**
 * Returns platforms that are executable — either via OpenRouter or their direct key.
 * When OPENROUTER_API_KEY is set, chatgpt/claude/gemini are all available.
 */
export function getAvailablePlatforms(
  requested: LLMPlatform[] = ENABLED_PLATFORMS,
): LLMPlatform[] {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  return requested.filter((p) => {
    if (hasOpenRouter) return true;
    switch (p) {
      case "chatgpt": return Boolean(process.env.OPENAI_API_KEY?.trim());
      case "claude":  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
      case "gemini":  return Boolean(
        process.env.GOOGLE_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim(),
      );
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
