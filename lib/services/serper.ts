/**
 * Serper.dev Google Search API — thin HTTP wrapper (no official Node SDK required).
 * @see https://serper.dev
 */

const SERPER_SEARCH_URL = "https://google.serper.dev/search";

export interface SerperSearchOptions {
  q: string;
  num?: number;
  gl?: string;
  hl?: string;
  autocorrect?: boolean;
}

export interface SerperOrganicItem {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
}

/** Loose shape — Serper adds fields over time (e.g. AI Overview). */
export type SerperSearchResponse = Record<string, unknown> & {
  organic?: SerperOrganicItem[];
  searchParameters?: { q?: string; gl?: string; hl?: string };
};

export class SerperError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SerperError";
  }
}

function getApiKey(): string {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) {
    throw new SerperError("SERPER_API_KEY is not configured");
  }
  return key;
}

export async function serperSearch(options: SerperSearchOptions): Promise<SerperSearchResponse> {
  const apiKey = getApiKey();
  const body = {
    q: options.q,
    num: Math.min(100, Math.max(1, options.num ?? 10)),
    gl: options.gl ?? "us",
    hl: options.hl ?? "en",
    autocorrect: options.autocorrect ?? true,
  };

  const res = await fetch(SERPER_SEARCH_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new SerperError(`Serper HTTP ${res.status}: ${text.slice(0, 400)}`, res.status);
  }

  try {
    return JSON.parse(text) as SerperSearchResponse;
  } catch {
    throw new SerperError("Serper returned non-JSON body");
  }
}

export interface SerpFeatureSummary {
  hasAiOverview: boolean;
  features: string[];
  /** Raw blocks we care about for debugging / UI (trimmed). */
  snippets: Record<string, unknown>;
}

/**
 * Detect prominent SERP modules from a Serper payload.
 * Field names may evolve; we treat unknown top-level objects as "features".
 */
export function summarizeSerpFeatures(payload: SerperSearchResponse): SerpFeatureSummary {
  const features: string[] = [];
  const snippets: Record<string, unknown> = {};

  const candidates: [string, unknown][] = [
    ["organic", payload.organic],
    ["peopleAlsoAsk", payload.peopleAlsoAsk],
    ["relatedSearches", payload.relatedSearches],
    ["answerBox", payload.answerBox],
    ["knowledgeGraph", payload.knowledgeGraph],
    ["topStories", payload.topStories],
    ["videos", payload.videos],
    ["images", payload.images],
    ["news", payload.news],
    ["shopping", payload.shopping],
    ["localResults", payload.localResults],
    ["aiOverview", (payload as { aiOverview?: unknown }).aiOverview],
    ["ai_overview", (payload as { ai_overview?: unknown }).ai_overview],
  ];

  let hasAiOverview = false;
  for (const [key, val] of candidates) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === "object" && val !== null && !Array.isArray(val) && Object.keys(val as object).length === 0) {
      continue;
    }
    features.push(key);
    if (key === "aiOverview" || key === "ai_overview") {
      hasAiOverview = true;
    }
    if (key !== "organic") {
      snippets[key] = Array.isArray(val) ? val.slice(0, 5) : val;
    }
  }

  if (!hasAiOverview) {
    const raw = payload as { aiOverview?: unknown; ai_overview?: unknown };
    hasAiOverview = Boolean(raw.aiOverview ?? raw.ai_overview);
  }

  return { hasAiOverview, features: Array.from(new Set(features)), snippets };
}

export function normalizeHost(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  try {
    const u = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return input
      .replace(/^https?:\/\//i, "")
      .split("/")[0]!
      .replace(/^www\./i, "")
      .toLowerCase();
  }
}

export function findBestOrganicRank(organic: SerperOrganicItem[] | undefined, host: string): { url: string; position: number } | null {
  if (!organic?.length || !host) return null;
  const h = host.toLowerCase();
  let best: { url: string; position: number } | null = null;
  for (const row of organic) {
    const link = row.link?.trim();
    const pos = row.position;
    if (!link || typeof pos !== "number") continue;
    try {
      const hostname = new URL(link).hostname.replace(/^www\./i, "").toLowerCase();
      if (hostname === h || hostname.endsWith(`.${h}`)) {
        if (!best || pos < best.position) {
          best = { url: link, position: pos };
        }
      }
    } catch {
      if (link.toLowerCase().includes(h)) {
        if (!best || pos < best.position) {
          best = { url: link, position: pos };
        }
      }
    }
  }
  return best;
}
