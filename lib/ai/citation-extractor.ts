import type { Citation, ProviderName } from "@/lib/ai/types";

const urlRegex = /https?:\/\/[^\s)\]]+/gi;

function normalizeDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "unknown";
  }
}

export function extractCitationsFromText(text: string): Citation[] {
  const matches = text.match(urlRegex) ?? [];
  const deduped = Array.from(new Set(matches));
  return deduped.map((url, index) => ({
    url,
    domain: normalizeDomain(url),
    position: index + 1,
  }));
}

export function extractCitations(
  provider: ProviderName,
  responseText: string,
  providedCitations: Citation[],
): Citation[] {
  if (provider === "perplexity" && providedCitations.length > 0) {
    return providedCitations.map((c, index) => ({
      ...c,
      domain: normalizeDomain(c.url),
      position: index + 1,
    }));
  }
  return extractCitationsFromText(responseText);
}
