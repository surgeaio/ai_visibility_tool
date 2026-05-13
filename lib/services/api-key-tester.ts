import type { ApiKeyProvider } from "@/lib/validators/api-keys.schema";

export interface ApiKeyTestResult {
  ok: boolean;
  message?: string;
}

export async function testUserApiKey(provider: ApiKeyProvider, secret: string): Promise<ApiKeyTestResult> {
  const trimmed = secret.trim();
  if (!trimmed) {
    return { ok: false, message: "Empty key" };
  }

  try {
    switch (provider) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${trimmed}` },
          signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok) {
          return { ok: false, message: `OpenAI returned ${res.status}` };
        }
        return { ok: true, message: "Connected to OpenAI" };
      }
      case "anthropic": {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": trimmed,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok) {
          return { ok: false, message: `Anthropic returned ${res.status}` };
        }
        return { ok: true, message: "Connected to Anthropic" };
      }
      case "gemini": {
        const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
        url.searchParams.set("key", trimmed);
        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(25_000) });
        if (!res.ok) {
          return { ok: false, message: `Gemini returned ${res.status}` };
        }
        return { ok: true, message: "Connected to Gemini" };
      }
      case "perplexity": {
        const res = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${trimmed}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(25_000),
        });
        if (!res.ok) {
          return { ok: false, message: `Perplexity returned ${res.status}` };
        }
        return { ok: true, message: "Connected to Perplexity" };
      }
      case "google_search_console":
      case "google_analytics":
        return {
          ok: false,
          message:
            "Google Search Console and Analytics need OAuth. Use the upcoming Google connect flow; storing a JSON service account here will be supported next.",
        };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error";
    return { ok: false, message: msg };
  }
}
