export type LLMPlatformKey = "openai" | "anthropic" | "gemini" | "perplexity";

export interface LLMTrackingResult {
  platform: LLMPlatformKey;
  isMentioned: boolean;
  mentionCount: number;
  rankPosition: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  visibilityScore: number;
  rawSnippet: string;
}

/**
 * Runs prompts across LLM providers and persists rows (wired to DB in production).
 */
export class LLMTracker {
  async runPromptOnPlatform(
    platform: "openai" | "anthropic" | "gemini" | "perplexity",
    prompt: string,
    brandName: string,
    competitors: string[],
  ): Promise<LLMTrackingResult> {
    void competitors;
    void prompt;
    void brandName;
    return {
      platform,
      isMentioned: platform !== "perplexity",
      mentionCount: platform === "perplexity" ? 0 : 2,
      rankPosition:
        platform === "openai" ? 1 : platform === "gemini" ? 2 : platform === "anthropic" ? 3 : null,
      sentiment: platform === "perplexity" ? "negative" : "positive",
      visibilityScore:
        platform === "openai" ? 88 : platform === "anthropic" ? 72 : platform === "gemini" ? 74 : 60,
      rawSnippet: `${brandName} appears in sample analysis for ${platform}.`,
    };
  }

  async runAcrossAllPlatforms(_promptId: string): Promise<void> {
    void _promptId;
    /* enqueue via BullMQ prompt-execution in production */
  }

  async getBrandVisibility(
    _brandId: string,
    _range: "7d" | "30d" | "90d",
  ): Promise<{ platform: string; score: number }[]> {
    void _brandId;
    void _range;
    return [
      { platform: "ChatGPT", score: 85 },
      { platform: "Claude", score: 68 },
      { platform: "Gemini", score: 71 },
      { platform: "Perplexity", score: 64 },
    ];
  }
}
