import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SiteSummary {
  siteUrl: string;
  permissionLevel: string;
}

export interface IndexedPageSummary {
  url: string;
  isIndexed: boolean;
  coverageState: string | null;
  issue: string | null;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const delay = 1000 * (i + 1);
      console.warn(`[gsc-api] ${label} attempt ${i + 1} failed, retry in ${delay}ms`, e);
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}

export class GoogleSearchConsoleService {
  constructor(private readonly auth: OAuth2Client) {}

  async listSites(): Promise<SiteSummary[]> {
    return withRetry(async () => {
    const webmasters = google.webmasters({ version: "v3", auth: this.auth });
    const { data } = await webmasters.sites.list();
    return (
      data.siteEntry?.map((s) => ({
        siteUrl: s.siteUrl ?? "",
        permissionLevel: s.permissionLevel ?? "",
      })) ?? []
    ).filter((s) => s.siteUrl);
    }, "sites.list");
  }

  async getSearchAnalytics(
    siteUrl: string,
    options: {
      startDate: string;
      endDate: string;
      dimensions: ("query" | "page" | "country" | "device" | "date")[];
      rowLimit?: number;
    },
  ): Promise<SearchAnalyticsRow[]> {
    return withRetry(async () => {
      const webmasters = google.webmasters({ version: "v3", auth: this.auth });
      const { data } = await webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: options.startDate,
          endDate: options.endDate,
          dimensions: options.dimensions,
          rowLimit: options.rowLimit ?? 1000,
        },
      });
      return (
        data.rows?.map((row) => ({
          keys: row.keys ?? [],
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        })) ?? []
      );
    }, `searchanalytics.${options.dimensions.join("+")}`);
  }

  /** URL Inspection at scale is quota-heavy; return [] until a dedicated indexer job is added. */
  async getIndexedPages(_siteUrl: string): Promise<IndexedPageSummary[]> {
    void _siteUrl;
    return [];
  }
}
