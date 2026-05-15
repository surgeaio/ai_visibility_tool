import type { BrandAuditReport, LlmVisibilityQueryResult, WebsiteAuditResult } from "@/lib/brand-audit/types";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

/** Tables added in migration 20260515000000 — not yet in generated Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditDb = { from: (table: string) => any };

export class BrandAuditRepository {
  private db(): AuditDb | null {
    const client = tryCreateAdminSupabaseClient();
    return client as unknown as AuditDb | null;
  }

  async saveScrape(input: {
    userId: string | null;
    brandName: string;
    url: string;
    audit: WebsiteAuditResult;
    seoScore: number;
    technicalScore: number;
    contentScore: number;
    overallScore: number;
  }): Promise<string | null> {
    const supabase = this.db();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("brand_audit_scrapes")
      .insert({
        user_id: input.userId,
        brand_name: input.brandName,
        url: input.url,
        audit_data: input.audit as unknown as Record<string, unknown>,
        seo_score: input.seoScore,
        technical_score: input.technicalScore,
        content_score: input.contentScore,
        overall_score: input.overallScore,
        scraped_at: input.audit.scrapedAt,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[brand-audit] saveScrape", error);
      return null;
    }
    return data.id as string;
  }

  async saveLlmResults(userId: string | null, results: LlmVisibilityQueryResult[]): Promise<boolean> {
    const supabase = this.db();
    if (!supabase || results.length === 0) return false;
    const rows = results.map((r) => ({
      user_id: userId,
      brand_name: r.brandName,
      brand_url: r.brandUrl,
      llm_provider: r.llmProvider,
      llm_model: r.llmModel,
      query_text: r.queryText,
      query_category: r.queryCategory,
      brand_mentioned: r.brandMentioned,
      mention_position: r.mentionPosition,
      sentiment: r.sentiment,
      exact_quote: r.exactQuote,
      competitors_mentioned: r.competitorsMentioned,
      full_response: r.fullResponse,
      visibility_score: r.visibilityScore,
      queried_at: r.queriedAt,
    }));
    const { error } = await supabase.from("brand_audit_llm_results").insert(rows);
    if (error) {
      console.error("[brand-audit] saveLlmResults", error);
      return false;
    }
    return true;
  }

  async saveReport(input: {
    userId: string | null;
    report: BrandAuditReport;
    websiteAuditId: string | null;
  }): Promise<string | null> {
    const supabase = this.db();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("brand_audit_reports")
      .insert({
        user_id: input.userId,
        brand_name: input.report.brandName,
        brand_url: input.report.brandUrl,
        website_audit_id: input.websiteAuditId,
        llm_visibility_score: input.report.scores.llmVisibilityScore,
        seo_score: input.report.scores.seoScore,
        overall_health_score: input.report.scores.overallHealthScore,
        report_data: input.report as unknown as Record<string, unknown>,
        competitors_found: input.report.competitorsFound,
        recommendations: input.report.recommendations,
        is_sample_data: input.report.isSampleData,
        generated_at: input.report.generatedAt,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[brand-audit] saveReport", error);
      return null;
    }
    return data.id as string;
  }

  async getLatestReport(brandName: string): Promise<BrandAuditReport | null> {
    const supabase = this.db();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("brand_audit_reports")
      .select("report_data")
      .eq("brand_name", brandName)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data.report_data as BrandAuditReport;
  }
}
