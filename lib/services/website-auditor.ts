import * as cheerio from "cheerio";

export interface PageAuditSummary {
  url: string;
  title: string | null;
  wordCount: number;
  h1Count: number;
  issues: { severity: "critical" | "warning"; message: string }[];
}

/** Lightweight HTML audit (no headless browser). Puppeteer can be added later for JS-heavy sites. */
export class WebsiteAuditor {
  async auditPage(url: string): Promise<PageAuditSummary> {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text() || null;
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText ? bodyText.split(" ").length : 0;
    const h1Count = $("h1").length;
    const issues: PageAuditSummary["issues"] = [];
    if (!title) issues.push({ severity: "critical", message: "Missing <title>" });
    if (h1Count === 0) issues.push({ severity: "critical", message: "Missing H1" });
    if (h1Count > 1) issues.push({ severity: "warning", message: "Multiple H1 tags" });
    if (wordCount < 300) issues.push({ severity: "warning", message: "Thin content (<300 words)" });
    return { url, title, wordCount, h1Count, issues };
  }

  async crawlSite(_brandId: string, _maxPages = 20): Promise<{ pages: PageAuditSummary[] }> {
    void _brandId;
    void _maxPages;
    return { pages: [] };
  }

  async checkIndexing(_brandId: string): Promise<{ indexed: number; notIndexed: number }> {
    void _brandId;
    return { indexed: 0, notIndexed: 0 };
  }
}
