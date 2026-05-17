import { WebsiteCrawler } from "@/lib/services/website-crawler";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export type WebsiteAuditRunResult = {
  auditId: string | null;
  pages: number;
  overallScore: number;
  critical: number;
  warnings: number;
};

/** Run a full website crawl and persist audit rows (sync path — no BullMQ). */
export async function runWebsiteAuditSync(params: {
  brandId: string;
  siteUrl: string;
  maxPages: number;
}): Promise<WebsiteAuditRunResult> {
  const { brandId, siteUrl, maxPages } = params;
  const crawler = new WebsiteCrawler();
  try {
    await crawler.initialize();
    const pages = await crawler.crawlSite(siteUrl, Math.min(Math.max(1, maxPages), 100));
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

    const admin = tryCreateAdminSupabaseClient();
    if (!admin) {
      return { auditId: null, pages: pages.length, overallScore: overall, critical, warnings };
    }

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
    if (aErr) throw new Error(aErr.message);
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

    return { auditId, pages: pages.length, overallScore: overall, critical, warnings };
  } finally {
    await crawler.cleanup();
  }
}
