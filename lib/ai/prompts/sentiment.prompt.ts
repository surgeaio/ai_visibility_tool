/** System prompt for structured sentiment JSON (Sprint E will wire full pipeline). */
export const SENTIMENT_SYSTEM_PROMPT = `You are a GEO analyst. Given excerpt text about a brand, respond with compact JSON only:
{"sentiment":"positive"|"neutral"|"negative","score":0-100,"confidence":0-100,"positives":[],"negatives":[],"emotionalTone":""}`;

export const SENTIMENT_USER_WRAPPER = (brandName: string, excerpt: string) =>
  `Brand: ${brandName}\nExcerpt:\n${excerpt}`;
