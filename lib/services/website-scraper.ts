import * as cheerio from "cheerio";
import type { WebsiteAuditResult } from "@/lib/brand-audit/types";

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = "Mozilla/5.0 (compatible; AuditBot/1.0; +https://surgeaio.com)";

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function extractSchemaTypes(html: string): string[] {
  const types = new Set<string>();
  const re = /"@type"\s*:\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    types.add(m[1]);
  }
  return [...types];
}

function detectTechnologies(html: string): string[] {
  const tech: string[] = [];
  if (html.includes("__NEXT_DATA__")) tech.push("Next.js");
  if (/react/i.test(html) && (html.includes("react-dom") || html.includes("_react"))) tech.push("React");
  if (html.includes("wp-content") || html.includes("wordpress")) tech.push("WordPress");
  if (html.includes("hs-scripts") || html.includes("hubspot")) tech.push("HubSpot");
  if (/gtag\(|google-analytics|G-[A-Z0-9]+|UA-\d+-\d+/i.test(html)) tech.push("Google Analytics");
  const gtm = html.match(/GTM-[A-Z0-9]+/i);
  if (gtm) tech.push("Google Tag Manager");
  if (html.includes("intercom")) tech.push("Intercom");
  if (html.includes("drift.com") || html.includes("driftt")) tech.push("Drift");
  if (html.includes("crisp.chat")) tech.push("Crisp");
  if (html.includes("js.stripe.com")) tech.push("Stripe");
  return [...new Set(tech)];
}

function extractKeywords(text: string, limit = 8): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const stop = new Set([
    "about", "their", "there", "which", "would", "could", "should", "these", "those",
    "where", "while", "with", "from", "your", "have", "this", "that", "more", "also",
  ]);
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function isInternalLink(href: string, origin: string): boolean {
  try {
    const u = new URL(href, origin);
    const o = new URL(origin);
    return u.hostname === o.hostname;
  } catch {
    return false;
  }
}

export async function scrapeWebsite(rawUrl: string): Promise<WebsiteAuditResult> {
  const url = normalizeUrl(rawUrl);
  const origin = new URL(url).origin;
  const started = Date.now();
  let html = "";
  let responseTimeMs = 0;
  let error: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    responseTimeMs = Date.now() - started;
    if (!res.ok) {
      error = `HTTP ${res.status}`;
    }
    html = await res.text();
  } catch (e) {
    responseTimeMs = Date.now() - started;
    error = e instanceof Error ? e.message : "Fetch failed";
    html = "";
  }

  const $ = cheerio.load(html || "<html></html>");
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  const h1Text: string[] = [];
  const h2Text: string[] = [];
  const h3Text: string[] = [];
  const headings: { level: string; text: string }[] = [];
  $("h1").each((_, el) => {
    const t = $(el).text().trim();
    if (t) {
      h1Text.push(t);
      headings.push({ level: "h1", text: t });
    }
  });
  $("h2").each((_, el) => {
    const t = $(el).text().trim();
    if (t) {
      h2Text.push(t);
      headings.push({ level: "h2", text: t });
    }
  });
  $("h3").each((_, el) => {
    const t = $(el).text().trim();
    if (t) {
      h3Text.push(t);
      headings.push({ level: "h3", text: t });
    }
  });

  let internalLinks = 0;
  let externalLinks = 0;
  const linkHrefs: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    linkHrefs.push(href);
    if (isInternalLink(href, origin)) internalLinks += 1;
    else externalLinks += 1;
  });

  let imageCount = 0;
  let imagesWithoutAlt = 0;
  $("img").each((_, el) => {
    imageCount += 1;
    const alt = $(el).attr("alt");
    if (!alt?.trim()) imagesWithoutAlt += 1;
  });

  const metaKeywordsRaw = $('meta[name="keywords"]').attr("content") ?? "";
  const metaKeywords = metaKeywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const robotsMeta = $('meta[name="robots"]').attr("content") ?? "";
  const isIndexable = !/noindex/i.test(robotsMeta);

  const schemaTypes = extractSchemaTypes(html);
  const technologies = detectTechnologies(html);
  const gtmMatch = html.match(/GTM-[A-Z0-9]+/i);

  let hasSitemap = false;
  let sitemapUrl = "";
  try {
    const smRes = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (smRes.ok) {
      hasSitemap = true;
      sitemapUrl = `${origin}/sitemap.xml`;
    }
  } catch {
    /* optional */
  }

  const lowerHtml = html.toLowerCase();
  const lowerLinks = linkHrefs.join(" ").toLowerCase();
  const hasContactInfo =
    lowerHtml.includes("contact") || lowerHtml.includes("@") || lowerHtml.includes("phone");
  const hasPricingPage =
    /pricing|plans|packages/i.test(lowerLinks) || /pricing|plans/i.test(lowerHtml);
  const hasBlogSection = /blog|articles|insights|resources/i.test(lowerLinks);

  const ctaTexts: string[] = [];
  $("a, button").each((_, el) => {
    const t = $(el).text().trim();
    if (t.length >= 3 && t.length <= 40 && /demo|trial|start|get|book|contact|free|sign/i.test(t)) {
      ctaTexts.push(t);
    }
  });

  return {
    url,
    scrapedAt: new Date().toISOString(),
    error,
    basic: {
      title: $("title").first().text().trim(),
      metaDescription: $('meta[name="description"]').attr("content")?.trim() ?? "",
      metaKeywords,
      canonical: $('link[rel="canonical"]').attr("href") ?? "",
      lang: $("html").attr("lang") ?? "",
    },
    seo: {
      h1Count: h1Text.length,
      h1Text,
      h2Count: h2Text.length,
      h2Text: h2Text.slice(0, 12),
      h3Count: h3Text.length,
      imageCount,
      imagesWithoutAlt,
      internalLinks,
      externalLinks,
      wordCount,
      hasSchemaMarkup: schemaTypes.length > 0,
      schemaTypes,
      hasSitemap,
      sitemapUrl,
      robotsMeta,
      isIndexable,
    },
    social: {
      hasOpenGraph: Boolean($('meta[property="og:title"]').attr("content")),
      ogTitle: $('meta[property="og:title"]').attr("content") ?? "",
      ogDescription: $('meta[property="og:description"]').attr("content") ?? "",
      ogImage: $('meta[property="og:image"]').attr("content") ?? "",
      hasTwitterCard: Boolean($('meta[name="twitter:card"]').attr("content")),
      twitterCard: $('meta[name="twitter:card"]').attr("content") ?? "",
    },
    technical: {
      isHttps: url.startsWith("https://"),
      hasViewportMeta: Boolean($('meta[name="viewport"]').attr("content")),
      hasCanonical: Boolean($('link[rel="canonical"]').attr("href")),
      responseTimeMs,
      technologies,
      hasGoogleAnalytics: technologies.includes("Google Analytics"),
      hasGTM: technologies.includes("Google Tag Manager"),
      gtmId: gtmMatch?.[0] ?? "",
    },
    content: {
      headings: headings.slice(0, 20),
      mainKeywords: extractKeywords(bodyText),
      hasContactInfo,
      hasPricingPage,
      hasBlogSection,
      ctaTexts: [...new Set(ctaTexts)].slice(0, 8),
    },
  };
}
