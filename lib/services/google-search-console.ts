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

export class GoogleSearchConsoleService {
  constructor(private readonly auth: OAuth2Client) {}

  async listSites(): Promise<SiteSummary[]> {
    const webmasters = google.webmasters({ version: "v3", auth: this.auth });
    const { data } = await webmasters.sites.list();
    return (
      data.siteEntry?.map((s) => ({
        siteUrl: s.siteUrl ?? "",
        permissionLevel: s.permissionLevel ?? "",
      })) ?? []
    ).filter((s) => s.siteUrl);
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
  }

  /** URL Inspection at scale is quota-heavy; return [] until a dedicated indexer job is added. */
  async getIndexedPages(_siteUrl: string): Promise<IndexedPageSummary[]> {
    void _siteUrl;
    return [];
  }
}
