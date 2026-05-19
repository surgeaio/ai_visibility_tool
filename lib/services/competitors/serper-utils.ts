import { serperSearch, type SerperOrganicItem } from "@/lib/services/serper";

export interface SerpOrganicResult {
  position: number;
  link: string;
  title: string;
  snippet?: string;
}

const UTILITY_DOMAINS = [
  "wikipedia.org",
  "youtube.com",
  "reddit.com",
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "github.com",
  "medium.com",
  "quora.com",
  "stackoverflow.com",
  "amazon.com",
  "ebay.com",
  "google.com",
  "bing.com",
];

export function normalizeDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^https?:\/\//, "")
      .split("/")[0]!;
  }
}

export function isUtilityDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return UTILITY_DOMAINS.some((u) => d === u || d.endsWith(`.${u}`));
}

export function mapOrganicResults(organic: SerperOrganicItem[] | undefined): SerpOrganicResult[] {
  return (organic ?? []).map((r, i) => ({
    position: r.position ?? i + 1,
    link: r.link ?? "",
    title: r.title ?? "",
    snippet: r.snippet,
  })).filter((r) => r.link);
}

export async function searchSerperOrganic(query: string, num = 10): Promise<SerpOrganicResult[]> {
  const data = await serperSearch({ q: query, num });
  return mapOrganicResults(data.organic);
}
