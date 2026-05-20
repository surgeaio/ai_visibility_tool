export interface BrandForDetection {
  name: string;
  domain?: string | null;
  website?: string | null;
  aliases?: string[];
}

export interface BrandMentionDetection {
  mentioned: boolean;
  position: number | null;
}

/** Normalize for fuzzy comparison (ignore dots, spaces, hyphens). */
export function normalizeBrandToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** All lowercase strings to search in response text. */
export function buildBrandNameVariations(brand: BrandForDetection): string[] {
  const names: string[] = [];

  if (brand.name?.trim()) {
    const lower = brand.name.toLowerCase().trim();
    names.push(lower);
    const withoutSuffix = lower
      .replace(/\s*(llc|inc|corp|ltd|co\.?|company)\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (withoutSuffix && withoutSuffix !== lower) names.push(withoutSuffix);
    const compact = lower.replace(/\s+/g, "");
    if (compact !== lower) names.push(compact);
  }

  for (const alias of brand.aliases ?? []) {
    if (alias?.trim()) names.push(alias.toLowerCase().trim());
  }

  const domainRaw = (brand.domain ?? "").trim().toLowerCase();
  if (domainRaw) {
    names.push(domainRaw.replace(/^www\./, ""));
    const domainBase = domainRaw.split(".")[0];
    if (domainBase.length > 3) names.push(domainBase);
  }

  const website = (brand.website ?? "").trim();
  if (website) {
    try {
      const url = new URL(website.startsWith("http") ? website : `https://${website}`);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      names.push(host);
      const hostBase = host.split(".")[0];
      if (hostBase.length > 3) names.push(hostBase);
    } catch {
      /* skip invalid URL */
    }
  }

  return [...new Set(names.filter((n) => n.length > 2))];
}

export function tokensMatch(a: string, b: string): boolean {
  const na = normalizeBrandToken(a);
  const nb = normalizeBrandToken(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function candidateMatchesOwnBrand(
  candidateName: string,
  brand: BrandForDetection,
): boolean {
  const variations = buildBrandNameVariations(brand);
  const c = candidateName.toLowerCase().trim();
  return variations.some((v) => tokensMatch(c, v));
}

export function detectBrandMention(
  responseText: string,
  brand: BrandForDetection,
): BrandMentionDetection {
  const text = responseText.toLowerCase();
  const variations = buildBrandNameVariations(brand);

  let mentioned = false;
  for (const name of variations) {
    if (text.includes(name)) {
      mentioned = true;
      break;
    }
  }

  let position: number | null = null;
  if (mentioned) {
    const lines = responseText.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const trimmed = lines[i].trim();
      const hasNumber = /^\d+[\.\)]\s/.test(trimmed);

      for (const name of variations) {
        if (!line.includes(name)) continue;
        if (hasNumber) {
          const match = trimmed.match(/^(\d+)[\.\)]/);
          if (match) {
            position = parseInt(match[1], 10);
            break;
          }
        }
        if (position === null) position = i + 1;
        break;
      }
      if (position !== null) break;
    }
  }

  return { mentioned, position };
}

export function calculateBrandSentiment(
  responseText: string,
  brand: BrandForDetection,
): number {
  const variations = buildBrandNameVariations(brand);
  const sentences = responseText.split(/[.!?]+/);
  const brandSentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return variations.some((v) => lower.includes(v));
  });

  if (brandSentences.length === 0) return 50;

  const textToAnalyze = brandSentences.join(" ").toLowerCase();

  const positiveWords = [
    "best",
    "top",
    "excellent",
    "great",
    "leading",
    "innovative",
    "comprehensive",
    "effective",
    "proven",
    "trusted",
    "reliable",
    "advanced",
    "premier",
    "outstanding",
    "superior",
    "recommended",
    "popular",
    "widely used",
    "well-regarded",
    "strong",
    "robust",
  ];

  const negativeWords = [
    "poor",
    "bad",
    "worst",
    "limited",
    "lacking",
    "weak",
    "expensive",
    "overpriced",
    "complex",
    "difficult",
    "unreliable",
    "outdated",
    "inferior",
    "disappointing",
    "avoid",
    "not recommended",
  ];

  let score = 50;
  for (const word of positiveWords) {
    if (textToAnalyze.includes(word)) score += 5;
  }
  for (const word of negativeWords) {
    if (textToAnalyze.includes(word)) score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

export function sentimentLabelFromScore(
  score: number,
): "positive" | "neutral" | "negative" {
  if (score >= 61) return "positive";
  if (score >= 41) return "neutral";
  return "negative";
}

export function extractMentionContext(
  responseText: string,
  brand: BrandForDetection,
  maxLen = 200,
): string | null {
  const variations = buildBrandNameVariations(brand);
  const lower = responseText.toLowerCase();
  for (const name of variations) {
    const idx = lower.indexOf(name);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 80);
    const end = Math.min(responseText.length, idx + name.length + 80);
    return responseText.slice(start, end).trim().slice(0, maxLen);
  }
  return null;
}
