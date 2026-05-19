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

export type GscSearchType = "web" | "image" | "video" | "news" | "googleNews" | "discover";

const GSC_ROW_LIMIT = 25_000;

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

  /**
   * Property-level totals for a date range (no dimensions) — matches GSC summary cards.
   */
  async getPropertyTotals(
    siteUrl: string,
    startDate: string,
    endDate: string,
    searchType: GscSearchType = "web",
  ): Promise<SearchAnalyticsRow> {
    const rows = await this.getSearchAnalytics(siteUrl, {
      startDate,
      endDate,
      dimensions: [],
      searchType,
      rowLimit: 1,
    });
    return (
      rows[0] ?? {
        keys: [],
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
      }
    );
  }

  async getSearchAnalytics(
    siteUrl: string,
    options: {
      startDate: string;
      endDate: string;
      dimensions: ("query" | "page" | "country" | "device" | "date")[];
      searchType?: GscSearchType;
      aggregationType?: "auto" | "byPage" | "byProperty";
      rowLimit?: number;
    },
  ): Promise<SearchAnalyticsRow[]> {
    return this.getSearchAnalyticsPaginated(siteUrl, {
      ...options,
      rowLimit: options.rowLimit ?? GSC_ROW_LIMIT,
    });
  }

  /** Paginates through all rows (GSC max 25k per request). */
  async getSearchAnalyticsPaginated(
    siteUrl: string,
    options: {
      startDate: string;
      endDate: string;
      dimensions: ("query" | "page" | "country" | "device" | "date")[];
      searchType?: GscSearchType;
      aggregationType?: "auto" | "byPage" | "byProperty";
      rowLimit?: number;
    },
  ): Promise<SearchAnalyticsRow[]> {
    const rowLimit = Math.min(options.rowLimit ?? GSC_ROW_LIMIT, GSC_ROW_LIMIT);
    const searchType = options.searchType ?? "web";
    const all: SearchAnalyticsRow[] = [];
    let startRow = 0;

    while (true) {
      const batch = await withRetry(async () => {
        const webmasters = google.webmasters({ version: "v3", auth: this.auth });
        const requestBody: {
          startDate: string;
          endDate: string;
          dimensions?: string[];
          searchType: GscSearchType;
          aggregationType?: string;
          rowLimit: number;
          startRow: number;
        } = {
          startDate: options.startDate,
          endDate: options.endDate,
          searchType,
          rowLimit,
          startRow,
        };

        if (options.dimensions.length > 0) {
          requestBody.dimensions = options.dimensions;
        }
        if (options.aggregationType) {
          requestBody.aggregationType = options.aggregationType;
        }

        const { data } = await webmasters.searchanalytics.query({
          siteUrl,
          requestBody,
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
      }, `searchanalytics.${options.dimensions.join("+") || "totals"}@${startRow}`);

      all.push(...batch);
      if (batch.length < rowLimit) break;
      startRow += rowLimit;
    }

    return all;
  }

  /** URL Inspection at scale is quota-heavy; return [] until a dedicated indexer job is added. */
  async getIndexedPages(_siteUrl: string): Promise<IndexedPageSummary[]> {
    void _siteUrl;
    return [];
  }
}
