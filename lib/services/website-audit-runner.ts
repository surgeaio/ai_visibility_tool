import { WebsiteCrawler } from "@/lib/services/website-crawler";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export type WebsiteAuditRunResult = {
  auditId: string | null;
  pages: number;
  overallScore: number;
  critical: number;
  warnings: number;
};

export function normalizeSiteUrl(raw: string): string {
  let siteUrl = raw.trim();
  if (!siteUrl) throw new Error("Website URL is empty");
  if (!siteUrl.startsWith("http://") && !siteUrl.startsWith("https://")) {
    siteUrl = `https://${siteUrl}`;
  }
  try {
    new URL(siteUrl);
  } catch {
    throw new Error(`Invalid website URL: ${raw}`);
  }
  return siteUrl;
}

/** Run a full website crawl and persist audit rows (sync path — no BullMQ). */
export async function runWebsiteAuditSync(params: {
  brandId: string;
  siteUrl: string;
  maxPages: number;
}): Promise<WebsiteAuditRunResult> {
  const { brandId, maxPages } = params;
  const siteUrl = normalizeSiteUrl(params.siteUrl);

  const admin = tryCreateAdminSupabaseClient();
  if (!admin) {
    throw new Error(
      "Server cannot save audit results (SUPABASE_SERVICE_ROLE_KEY missing). Configure it in Vercel.",
    );
  }

  const { data: brand, error: brandError } = await admin
    .from("brands")
    .select("id, name, website")
    .eq("id", brandId)
    .maybeSingle();

  if (brandError) throw new Error(`Brand lookup failed: ${brandError.message}`);
  if (!brand) throw new Error(`Brand not found: ${brandId}`);

  const effectiveUrl = siteUrl || (brand.website ? normalizeSiteUrl(brand.website) : null);
  if (!effectiveUrl) {
    throw new Error(
      `Brand "${brand.name}" has no website set. Add a website URL in Supabase (brands.website) or brand settings.`,
    );
  }

  console.log("[website-audit] crawl start", { brandId, siteUrl: effectiveUrl, maxPages });

  const crawler = new WebsiteCrawler();
  try {
    const pages = await crawler.crawlSite(effectiveUrl, Math.min(Math.max(1, maxPages), 100));

    if (!pages.length) {
      throw new Error(`No pages could be crawled for ${effectiveUrl}`);
    }

    const critical = pages.reduce(
      (a, p) => a + p.issues.filter((i) => i.severity === "critical").length,
      0,
    );
    const warnings = pages.reduce(
      (a, p) => a + p.issues.filter((i) => i.severity === "warning").length,
      0,
    );
    const overall =
      pages.length > 0
        ? Math.max(0, Math.min(100, 100 - critical * 3 - Math.min(40, warnings)))
        : 0;

    const { data: audit, error: aErr } = await admin
      .from("website_audits")
      .insert({
        brand_id: brandId,
        total_pages: pages.length,
        pages_with_issues: pages.filter((p) => p.issues.length > 0).length,
        critical_issues: critical,
        warnings,
        overall_score: overall,
        audit_completed_at: new Date().toISOString(),
        crawl_progress: 100,
      })
      .select("id")
      .single();
    if (aErr) throw new Error(`Failed to save audit: ${aErr.message}`);
    const auditId = audit.id as string;

    for (const p of pages) {
      const { error: pErr } = await admin.from("page_audits").insert({
        audit_id: auditId,
        brand_id: brandId,
        url: p.url,
        title: p.title,
        title_length: p.titleLength,
        meta_description: p.metaDescription,
        meta_description_length: p.metaDescriptionLength,
        h1_count: p.h1Count,
        word_count: p.wordCount,
        internal_links_count: p.internalLinks,
        external_links_count: p.externalLinks,
        images_count: p.images,
        images_without_alt: p.imagesWithoutAlt,
        has_schema: p.hasSchema,
        schema_types: p.schemaTypes,
        has_faq_schema: p.hasFaqSchema,
        page_speed_mobile: null,
        page_speed_desktop: null,
        issues: p.issues,
        canonical_url: p.canonicalUrl,
        robots_meta: p.robotsMeta,
      });
      if (pErr) console.error("[website-audit] page insert", pErr.message);
    }

    console.log("[website-audit] crawl done", { auditId, pages: pages.length });
    return { auditId, pages: pages.length, overallScore: overall, critical, warnings };
  } finally {
    await crawler.cleanup();
  }
}
