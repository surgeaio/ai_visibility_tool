/**
 * Sprint A.5 note:
 * In CI/local without Supabase CLI, this file serves as the generated Database type target.
 * Replace via: supabase gen types typescript --local > lib/supabase/database.types.ts
 */
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; slug: string | null; plan: string; created_at: string };
      };
      organization_members: {
        Row: { id: string; org_id: string; user_id: string; role: string; created_at: string };
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
        };
      };
    };
  };
}
