/** Prompt templates for multi-model visibility analysis. */
export const ANALYSIS_SYSTEM_PROMPT =
  "You compare how AI assistants discuss brands. Be factual, cite uncertainty, and prefer structured bullets.";

export const ANALYSIS_USER_WRAPPER = (prompt: string, brandName: string) =>
  `User query: ${prompt}\nPrimary brand to score: ${brandName}\nSummarize visibility, positioning, and risks.`;
