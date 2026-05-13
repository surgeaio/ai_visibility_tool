import type { SentimentResult } from "./types";
import OpenAI from "openai";

export async function analyzeSentiment(
  text: string,
  brandName: string,
  opts?: { openAiApiKey?: string },
): Promise<SentimentResult> {
  const key = opts?.openAiApiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const score = text.toLowerCase().includes("negative") || text.toLowerCase().includes("expensive")
      ? 38
      : text.toLowerCase().includes("praised") || text.toLowerCase().includes("best")
        ? 88
        : 55;
    const sentiment = score >= 61 ? "positive" : score >= 41 ? "neutral" : "negative";
    return {
      sentiment,
      score,
      confidence: 72,
      positiveSignals: sentiment === "positive" ? ["clear value prop"] : [],
      negativeSignals: sentiment === "negative" ? ["price sensitivity"] : [],
      keywords: ["CRM", brandName],
      pattern: null,
    };
  }

  const openai = new OpenAI({ apiKey: key });
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a sentiment analysis engine. Analyze how the AI response describes the specified brand.
Return ONLY valid JSON with this exact structure:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": number,
  "confidence": number,
  "positiveSignals": string[],
  "negativeSignals": string[],
  "keywords": string[],
  "pattern": string | null
}

Score guide: 0-40 = negative, 41-60 = neutral, 61-100 = positive`,
      },
      {
        role: "user",
        content: `Brand: ${brandName}\n\nText to analyze: "${text}"`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as SentimentResult;
}
