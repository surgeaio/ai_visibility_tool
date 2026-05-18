/**
 * Hand-maintained Supabase `Database` shape (Row + Insert + Update + Relationships).
 * Regenerate with: `supabase gen types typescript --local --schema public > lib/supabase/database.types.ts`
 * then re-merge Insert/Update if the CLI omits them.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string | null; plan: string; created_at: string };
        Insert: { id?: string; name: string; slug?: string | null; plan: string; created_at?: string };
        Update: Partial<{ id: string; name: string; slug: string | null; plan: string; created_at: string }>;
        Relationships: [];
      };
      organization_members: {
        Row: { id: string; org_id: string; user_id: string; role: string; created_at: string };
        Insert: { id?: string; org_id: string; user_id: string; role: string; created_at?: string };
        Update: Partial<{
          id: string;
          org_id: string;
          user_id: string;
          role: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          org_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          org_id?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          org_id: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          user_id: string | null;
          org_id: string | null;
          name: string;
          website: string | null;
          domain: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          org_id?: string | null;
          name: string;
          website?: string | null;
          domain?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string | null;
          org_id: string | null;
          name: string;
          website: string | null;
          domain: string | null;
          category: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      prompts: {
        Row: {
          id: string;
          brand_id: string;
          text: string;
          category: string | null;
          frequency: string | null;
          country: string | null;
          tags: string[] | null;
          models: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          text: string;
          category?: string | null;
          frequency?: string | null;
          country?: string | null;
          tags?: string[] | null;
          models?: string[] | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          text: string;
          category: string | null;
          frequency: string | null;
          country: string | null;
          tags: string[] | null;
          models: string[] | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      prompt_schedules: {
        Row: {
          id: string;
          prompt_id: string;
          brand_id: string;
          frequency: string;
          cron_expression: string | null;
          timezone: string | null;
          is_paused: boolean | null;
          next_run_at: string | null;
          last_run_at: string | null;
          last_run_status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          prompt_id: string;
          brand_id: string;
          frequency?: string;
          cron_expression?: string | null;
          timezone?: string | null;
          is_paused?: boolean | null;
          next_run_at?: string | null;
          last_run_at?: string | null;
          last_run_status?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          prompt_id: string;
          brand_id: string;
          frequency: string;
          cron_expression: string | null;
          timezone: string | null;
          is_paused: boolean | null;
          next_run_at: string | null;
          last_run_at: string | null;
          last_run_status: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      competitors: {
        Row: {
          id: string;
          brand_id: string;
          competitor_name: string;
          domain: string | null;
          website: string | null;
          aliases: string[] | null;
          is_tracked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          competitor_name: string;
          domain?: string | null;
          website?: string | null;
          aliases?: string[] | null;
          is_tracked?: boolean;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          competitor_name: string;
          domain: string | null;
          website: string | null;
          aliases: string[] | null;
          is_tracked: boolean;
          created_at: string;
        }>;
        Relationships: [];
      };
      analysis_results: {
        Row: {
          id: string;
          prompt_id: string | null;
          brand_id: string | null;
          model: string;
          response_text: string | null;
          visibility: boolean | null;
          position: number | null;
          sentiment: string | null;
          sentiment_score: number | null;
          confidence: number | null;
          positive_signals: string[] | null;
          negative_signals: string[] | null;
          keywords: string[] | null;
          analyzed_at: string;
        };
        Insert: {
          id?: string;
          prompt_id?: string | null;
          brand_id?: string | null;
          model: string;
          response_text?: string | null;
          visibility?: boolean | null;
          position?: number | null;
          sentiment?: string | null;
          sentiment_score?: number | null;
          confidence?: number | null;
          positive_signals?: string[] | null;
          negative_signals?: string[] | null;
          keywords?: string[] | null;
          analyzed_at?: string;
        };
        Update: Partial<{
          id: string;
          prompt_id: string | null;
          brand_id: string | null;
          model: string;
          response_text: string | null;
          visibility: boolean | null;
          position: number | null;
          sentiment: string | null;
          sentiment_score: number | null;
          confidence: number | null;
          positive_signals: string[] | null;
          negative_signals: string[] | null;
          keywords: string[] | null;
          analyzed_at: string;
        }>;
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          brand_id: string | null;
          pattern_id: string | null;
          pattern_type: string | null;
          action: string | null;
          description: string | null;
          priority: string | null;
          category: string | null;
          expected_geo_gain: number | null;
          status: string | null;
          created_at: string;
          difficulty: string | null;
          estimated_time: string | null;
          implementation_steps: Json | null;
          success_metrics: Json | null;
          evidence: Json | null;
          impact_score: number | null;
        };
        Insert: {
          id?: string;
          brand_id?: string | null;
          pattern_id?: string | null;
          pattern_type?: string | null;
          action?: string | null;
          description?: string | null;
          priority?: string | null;
          category?: string | null;
          expected_geo_gain?: number | null;
          status?: string | null;
          created_at?: string;
          difficulty?: string | null;
          estimated_time?: string | null;
          implementation_steps?: Json | null;
          success_metrics?: Json | null;
          evidence?: Json | null;
          impact_score?: number | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string | null;
          pattern_id: string | null;
          pattern_type: string | null;
          action: string | null;
          description: string | null;
          priority: string | null;
          category: string | null;
          expected_geo_gain: number | null;
          status: string | null;
          created_at: string;
          difficulty: string | null;
          estimated_time: string | null;
          implementation_steps: Json | null;
          success_metrics: Json | null;
          evidence: Json | null;
          impact_score: number | null;
        }>;
        Relationships: [];
      };
      user_api_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          key_name: string;
          encrypted_key: string;
          key_preview: string;
          is_active: boolean | null;
          last_used_at: string | null;
          test_status: string | null;
          test_error: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          key_name: string;
          encrypted_key: string;
          key_preview: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          test_status?: string | null;
          test_error?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          provider: string;
          key_name: string;
          encrypted_key: string;
          key_preview: string;
          is_active: boolean | null;
          last_used_at: string | null;
          test_status: string | null;
          test_error: string | null;
          created_at: string;
          updated_at: string | null;
        }>;
        Relationships: [];
      };
      llm_platforms: {
        Row: { id: string; name: string; display_name: string; is_active: boolean | null; created_at: string };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          is_active?: boolean | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          name: string;
          display_name: string;
          is_active: boolean | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      llm_brand_performance: {
        Row: {
          id: string;
          brand_id: string;
          platform_id: string | null;
          prompt_id: string | null;
          is_mentioned: boolean | null;
          mention_count: number | null;
          rank_position: number | null;
          sentiment: string | null;
          sentiment_score: number | null;
          visibility_score: number | null;
          raw_response: string | null;
          context: string | null;
          measured_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          platform_id?: string | null;
          prompt_id?: string | null;
          is_mentioned?: boolean | null;
          mention_count?: number | null;
          rank_position?: number | null;
          sentiment?: string | null;
          sentiment_score?: number | null;
          visibility_score?: number | null;
          raw_response?: string | null;
          context?: string | null;
          measured_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          platform_id: string | null;
          prompt_id: string | null;
          is_mentioned: boolean | null;
          mention_count: number | null;
          rank_position: number | null;
          sentiment: string | null;
          sentiment_score: number | null;
          visibility_score: number | null;
          raw_response: string | null;
          context: string | null;
          measured_at: string | null;
        }>;
        Relationships: [];
      };
      google_rankings: {
        Row: {
          id: string;
          brand_id: string;
          keyword: string;
          url: string;
          position: number | null;
          impressions: number | null;
          clicks: number | null;
          ctr: number | null;
          click_through_rate: number | null;
          country: string | null;
          device: string | null;
          measured_date: string;
          created_at: string | null;
          serp_features: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          keyword: string;
          url: string;
          position?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          ctr?: number | null;
          click_through_rate?: number | null;
          country?: string | null;
          device?: string | null;
          measured_date: string;
          created_at?: string | null;
          serp_features?: Record<string, unknown> | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          keyword: string;
          url: string;
          position: number | null;
          impressions: number | null;
          clicks: number | null;
          ctr: number | null;
          click_through_rate: number | null;
          country: string | null;
          device: string | null;
          measured_date: string;
          created_at: string | null;
          serp_features: Record<string, unknown> | null;
        }>;
        Relationships: [];
      };
      indexed_pages: {
        Row: {
          id: string;
          brand_id: string;
          url: string;
          is_indexed: boolean | null;
          coverage_state: string | null;
          last_crawled: string | null;
          last_crawled_by_google: string | null;
          indexing_issue: string | null;
          checked_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          url: string;
          is_indexed?: boolean | null;
          coverage_state?: string | null;
          last_crawled?: string | null;
          last_crawled_by_google?: string | null;
          indexing_issue?: string | null;
          checked_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          url: string;
          is_indexed: boolean | null;
          coverage_state: string | null;
          last_crawled: string | null;
          last_crawled_by_google: string | null;
          indexing_issue: string | null;
          checked_at: string | null;
        }>;
        Relationships: [];
      };
      gsc_connections: {
        Row: {
          id: string;
          user_id: string;
          brand_id: string;
          site_url: string;
          google_email: string | null;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          token_expires_at: string | null;
          is_active: boolean | null;
          last_synced_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand_id: string;
          site_url: string;
          google_email?: string | null;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          token_expires_at?: string | null;
          is_active?: boolean | null;
          last_synced_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          brand_id: string;
          site_url: string;
          google_email: string | null;
          access_token_encrypted: string;
          refresh_token_encrypted: string;
          token_expires_at: string | null;
          is_active: boolean | null;
          last_synced_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        }>;
        Relationships: [];
      };
      gsc_daily_metrics: {
        Row: {
          id: string;
          brand_id: string;
          site_url: string;
          metric_date: string;
          clicks: number | null;
          impressions: number | null;
          ctr: number | null;
          avg_position: number | null;
          indexed_pages: number | null;
          not_indexed_pages: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          site_url: string;
          metric_date: string;
          clicks?: number | null;
          impressions?: number | null;
          ctr?: number | null;
          avg_position?: number | null;
          indexed_pages?: number | null;
          not_indexed_pages?: number | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          site_url: string;
          metric_date: string;
          clicks: number | null;
          impressions: number | null;
          ctr: number | null;
          avg_position: number | null;
          indexed_pages: number | null;
          not_indexed_pages: number | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      gsc_query_rankings: {
        Row: {
          id: string;
          brand_id: string;
          site_url: string;
          metric_date: string;
          query: string;
          page_url: string;
          country: string | null;
          device: string | null;
          clicks: number | null;
          impressions: number | null;
          ctr: number | null;
          position: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          site_url: string;
          metric_date: string;
          query: string;
          page_url: string;
          country?: string | null;
          device?: string | null;
          clicks?: number | null;
          impressions?: number | null;
          ctr?: number | null;
          position?: number | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          site_url: string;
          metric_date: string;
          query: string;
          page_url: string;
          country: string | null;
          device: string | null;
          clicks: number | null;
          impressions: number | null;
          ctr: number | null;
          position: number | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      gsc_improvement_suggestions: {
        Row: {
          id: string;
          brand_id: string;
          query: string | null;
          page_url: string | null;
          suggestion_type: string;
          priority: string;
          title: string;
          description: string;
          action_items: unknown;
          metric_snapshot: unknown;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          query?: string | null;
          page_url?: string | null;
          suggestion_type: string;
          priority?: string;
          title: string;
          description: string;
          action_items?: unknown;
          metric_snapshot?: unknown;
          status?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          query: string | null;
          page_url: string | null;
          suggestion_type: string;
          priority: string;
          title: string;
          description: string;
          action_items: unknown;
          metric_snapshot: unknown;
          status: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      crawl_jobs: {
        Row: {
          id: string;
          brand_id: string;
          status: string;
          total_pages_target: number | null;
          pages_crawled: number | null;
          pages_failed: number | null;
          started_at: string | null;
          completed_at: string | null;
          error_log: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          status?: string;
          total_pages_target?: number | null;
          pages_crawled?: number | null;
          pages_failed?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_log?: string | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          status: string;
          total_pages_target: number | null;
          pages_crawled: number | null;
          pages_failed: number | null;
          started_at: string | null;
          completed_at: string | null;
          error_log: string | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      website_audits: {
        Row: {
          id: string;
          brand_id: string;
          total_pages: number | null;
          pages_with_issues: number | null;
          critical_issues: number | null;
          warnings: number | null;
          overall_score: number | null;
          audit_completed_at: string | null;
          crawl_progress: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          brand_id: string;
          total_pages?: number | null;
          pages_with_issues?: number | null;
          critical_issues?: number | null;
          warnings?: number | null;
          overall_score?: number | null;
          audit_completed_at?: string | null;
          crawl_progress?: number | null;
          created_at?: string | null;
        };
        Update: Partial<{
          id: string;
          brand_id: string;
          total_pages: number | null;
          pages_with_issues: number | null;
          critical_issues: number | null;
          warnings: number | null;
          overall_score: number | null;
          audit_completed_at: string | null;
          crawl_progress: number | null;
          created_at: string | null;
        }>;
        Relationships: [];
      };
      page_audits: {
        Row: {
          id: string;
          audit_id: string | null;
          brand_id: string;
          url: string;
          is_indexed: boolean | null;
          indexing_issue: string | null;
          title: string | null;
          title_length: number | null;
          meta_description: string | null;
          meta_description_length: number | null;
          h1_count: number | null;
          word_count: number | null;
          internal_links_count: number | null;
          external_links_count: number | null;
          images_count: number | null;
          images_without_alt: number | null;
          has_schema: boolean | null;
          schema_types: string[] | null;
          has_faq_schema: boolean | null;
          page_speed_mobile: number | null;
          page_speed_desktop: number | null;
          issues: unknown;
          audited_at: string | null;
          canonical_url: string | null;
          robots_meta: string | null;
        };
        Insert: {
          id?: string;
          audit_id?: string | null;
          brand_id: string;
          url: string;
          is_indexed?: boolean | null;
          indexing_issue?: string | null;
          title?: string | null;
          title_length?: number | null;
          meta_description?: string | null;
          meta_description_length?: number | null;
          h1_count?: number | null;
          word_count?: number | null;
          internal_links_count?: number | null;
          external_links_count?: number | null;
          images_count?: number | null;
          images_without_alt?: number | null;
          has_schema?: boolean | null;
          schema_types?: string[] | null;
          has_faq_schema?: boolean | null;
          page_speed_mobile?: number | null;
          page_speed_desktop?: number | null;
          issues?: unknown;
          audited_at?: string | null;
          canonical_url?: string | null;
          robots_meta?: string | null;
        };
        Update: Partial<{
          id: string;
          audit_id: string | null;
          brand_id: string;
          url: string;
          is_indexed: boolean | null;
          indexing_issue: string | null;
          title: string | null;
          title_length: number | null;
          meta_description: string | null;
          meta_description_length: number | null;
          h1_count: number | null;
          word_count: number | null;
          internal_links_count: number | null;
          external_links_count: number | null;
          images_count: number | null;
          images_without_alt: number | null;
          has_schema: boolean | null;
          schema_types: string[] | null;
          has_faq_schema: boolean | null;
          page_speed_mobile: number | null;
          page_speed_desktop: number | null;
          issues: unknown;
          audited_at: string | null;
          canonical_url: string | null;
          robots_meta: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
