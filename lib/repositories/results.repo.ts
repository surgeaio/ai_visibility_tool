import type { AnalysisResultRow } from "@/lib/supabase/types";
import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";
import { DatabaseError } from "@/lib/repositories/errors";

export interface ResultEntity {
  id: string;
  promptId: string;
  brandId: string;
  model: string;
  responseText: string | null;
  visibility: boolean | null;
  position: number | null;
  sentiment: string | null;
  sentimentScore: number | null;
  analyzedAt: string;
}

export interface ResultCreateInput {
  promptId: string;
  brandId: string;
  model: string;
  responseText: string;
  visibility: boolean;
  position: number;
  sentiment: string;
  sentimentScore: number;
  confidence: number;
  positiveSignals: string[];
  negativeSignals: string[];
  keywords: string[];
}

export interface ResultUpdateInput {
  sentiment?: string;
  sentimentScore?: number;
  confidence?: number;
}

function toResultEntity(row: AnalysisResultRow): ResultEntity {
  return {
    id: row.id,
    promptId: row.prompt_id,
    brandId: row.brand_id,
    model: row.model,
    responseText: row.response_text,
    visibility: row.visibility,
    position: row.position,
    sentiment: row.sentiment,
    sentimentScore: row.sentiment_score,
    analyzedAt: row.analyzed_at,
  };
}

export class ResultsRepository extends BaseRepository<
  ResultEntity,
  ResultCreateInput,
  ResultUpdateInput
> {
  async findById(id: string): Promise<ResultEntity | null> {
    if (this.isDemoMode()) return null;
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("analysis_results")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return toResultEntity(data as AnalysisResultRow);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<ResultEntity>> {
    const limit = options.pagination?.limit ?? 20;
    const offset = options.pagination?.offset ?? 0;
    if (this.isDemoMode()) return { items: [], total: 0 };
    const supabase = await this.getClient();
    let query = supabase
      .from("analysis_results")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("analyzed_at", { ascending: options.sortOrder === "asc" });
    if (options.filters?.promptId) {
      query = query.eq("prompt_id", String(options.filters.promptId));
    }
    if (options.filters?.brandId) {
      query = query.eq("brand_id", String(options.filters.brandId));
    }
    const { data, error, count } = await query;
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as AnalysisResultRow[];
    return { items: rows.map(toResultEntity), total: count ?? rows.length };
  }

  async create(input: ResultCreateInput): Promise<ResultEntity> {
    if (this.isDemoMode()) {
      return {
        id: crypto.randomUUID(),
        promptId: input.promptId,
        brandId: input.brandId,
        model: input.model,
        responseText: input.responseText,
        visibility: input.visibility,
        position: input.position,
        sentiment: input.sentiment,
        sentimentScore: input.sentimentScore,
        analyzedAt: new Date().toISOString(),
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("analysis_results")
      .insert({
        prompt_id: input.promptId,
        brand_id: input.brandId,
        model: input.model,
        response_text: input.responseText,
        visibility: input.visibility,
        position: input.position,
        sentiment: input.sentiment,
        sentiment_score: input.sentimentScore,
        confidence: input.confidence,
        positive_signals: input.positiveSignals,
        negative_signals: input.negativeSignals,
        keywords: input.keywords,
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toResultEntity(data as AnalysisResultRow);
  }

  async update(id: string, input: ResultUpdateInput): Promise<ResultEntity> {
    if (this.isDemoMode()) {
      const existing = await this.findById(id);
      if (!existing) throw new DatabaseError("Result not found");
      return {
        ...existing,
        sentiment: input.sentiment ?? existing.sentiment,
        sentimentScore: input.sentimentScore ?? existing.sentimentScore,
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("analysis_results")
      .update({
        sentiment: input.sentiment,
        sentiment_score: input.sentimentScore,
        confidence: input.confidence,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toResultEntity(data as AnalysisResultRow);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isDemoMode()) return true;
    const supabase = await this.getClient();
    const { error } = await supabase.from("analysis_results").delete().eq("id", id);
    if (error) throw new DatabaseError(error.message);
    return true;
  }
}
