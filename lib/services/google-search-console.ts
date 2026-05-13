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

/** Google Search Console — OAuth + sync to be completed; methods are typed stubs. */
export class GoogleSearchConsoleService {
  async authenticate(_userId: string): Promise<null> {
    void _userId;
    return null;
  }

  async listSites(_userId: string): Promise<SiteSummary[]> {
    void _userId;
    return [];
  }

  async getSearchAnalytics(
    _userId: string,
    _siteUrl: string,
    _options: {
      startDate: string;
      endDate: string;
      dimensions: ("query" | "page" | "country" | "device")[];
      rowLimit?: number;
    },
  ): Promise<SearchAnalyticsRow[]> {
    void _userId;
    void _siteUrl;
    void _options;
    return [];
  }
}
