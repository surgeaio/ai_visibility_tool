import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export type CrawlIssue = { severity: "critical" | "warning"; type: string; count?: number };

export interface CrawledPage {
  url: string;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Count: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesWithoutAlt: number;
  hasSchema: boolean;
  schemaTypes: string[];
  hasFaqSchema: boolean;
  loadTimeMs: number;
  issues: CrawlIssue[];
}

function normalizeInternalUrl(origin: string, pathname: string): string {
  try {
    const u = new URL(pathname, origin);
    if (u.origin !== new URL(origin).origin) return "";
    return `${u.origin}${u.pathname}`;
  } catch {
    return "";
  }
}

function extractInternalLinks(html: string, pageUrl: string): string[] {
  const origin = new URL(pageUrl).origin;
  const $ = cheerio.load(html);
  const found = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    const abs = href.startsWith("http") ? href : normalizeInternalUrl(origin, href);
    if (!abs) return;
    try {
      const u = new URL(abs);
      if (u.origin !== new URL(origin).origin) return;
      found.add(`${u.origin}${u.pathname}`);
    } catch {
      /* skip */
    }
  });
  return Array.from(found);
}

function analyzeHtml(url: string, html: string, loadTimeMs: number): CrawledPage {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? null;
  const canonicalUrl = $('link[rel="canonical"]').attr("href")?.trim() ?? null;
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim() ?? null;
  const h1Count = $("h1").length;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() ?? "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    if (href.startsWith("/")) {
      internalLinks += 1;
      return;
    }
    if (href.startsWith("http")) {
      try {
        const h = new URL(href).hostname;
        if (h && h !== host) externalLinks += 1;
        else internalLinks += 1;
      } catch {
        /* skip */
      }
    }
  });
  const images = $("img").length;
  const imagesWithoutAlt = $("img:not([alt])").length;
  const schemaTypes: string[] = [];
  let hasFaqSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "{}");
      const t = (json as { "@type"?: string })["@type"];
      if (t) {
        schemaTypes.push(t);
        if (t === "FAQPage") hasFaqSchema = true;
      }
    } catch {
      /* skip */
    }
  });
  const issues: CrawlIssue[] = [];
  if (!title) issues.push({ severity: "critical", type: "missing_title" });
  if (title && title.length < 30) issues.push({ severity: "warning", type: "title_too_short" });
  if (!metaDescription) issues.push({ severity: "warning", type: "missing_meta_description" });
  if (h1Count === 0) issues.push({ severity: "critical", type: "missing_h1" });
  if (h1Count > 1) issues.push({ severity: "critical", type: "multiple_h1" });
  if (wordCount < 300) issues.push({ severity: "warning", type: "thin_content" });
  if (imagesWithoutAlt) issues.push({ severity: "warning", type: "images_without_alt", count: imagesWithoutAlt });
  if (robotsMeta?.toLowerCase().includes("noindex")) {
    issues.push({ severity: "critical", type: "noindex" });
  }
  if (loadTimeMs > 5000) issues.push({ severity: "critical", type: "slow_load" });

  return {
    url,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonicalUrl,
    robotsMeta,
    h1Count,
    wordCount,
    internalLinks,
    externalLinks,
    images,
    imagesWithoutAlt,
    hasSchema: schemaTypes.length > 0,
    schemaTypes,
    hasFaqSchema,
    loadTimeMs,
    issues,
  };
}

export class WebsiteCrawler {
  private browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  async initialize(): Promise<void> {
    if (this.browser) return;
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlPage(url: string): Promise<CrawledPage> {
    await this.initialize();
    const page = await this.browser!.newPage();
    const started = Date.now();
    try {
      await page.setUserAgent("Mozilla/5.0 (compatible; AIVisibilityBot/1.0)");
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 });
      const html = await page.content();
      return analyzeHtml(url, html, Date.now() - started);
    } finally {
      await page.close();
    }
  }

  async crawlSite(startUrl: string, maxPages: number): Promise<CrawledPage[]> {
    const visited = new Set<string>();
    const queue: string[] = [startUrl];
    const results: CrawledPage[] = [];

    while (queue.length > 0 && results.length < maxPages) {
      const next = queue.shift()!;
      if (visited.has(next)) continue;
      visited.add(next);
      try {
        await this.initialize();
        const page = await this.browser!.newPage();
        const started = Date.now();
        await page.setUserAgent("Mozilla/5.0 (compatible; AIVisibilityBot/1.0)");
        await page.goto(next, { waitUntil: "networkidle2", timeout: 45_000 });
        const html = await page.content();
        await page.close();
        const crawl = analyzeHtml(next, html, Date.now() - started);
        results.push(crawl);
        for (const link of extractInternalLinks(html, next)) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      } catch (e) {
        console.error("[crawl] failed", next, e);
      }
    }
    return results;
  }
}
