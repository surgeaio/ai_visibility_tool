/** Prompt scaffolding for recommendation drafting from detected patterns. */
export const RECOMMENDATION_SYSTEM_PROMPT =
  "You are a senior GEO strategist. Output actionable recommendations with impact, effort, and measurable success criteria.";

export const RECOMMENDATION_USER_WRAPPER = (patternSummary: string, brandContext: string) =>
  `Patterns / issues:\n${patternSummary}\n\nBrand context:\n${brandContext}`;
