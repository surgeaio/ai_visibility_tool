import { DEMO_CITATIONS } from "@/lib/demo-data";
import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";
import { DatabaseError } from "@/lib/repositories/errors";
import type { CitationRow } from "@/lib/supabase/types";

export interface CitationEntity {
  id: string;
  brandId: string;
  domain: string;
  url: string;
  model: string;
  createdAt: string;
}

export interface CitationCreateInput {
  brandId: string;
  domain: string;
  url: string;
  model: string;
}

export interface CitationUpdateInput {
  domain?: string;
  url?: string;
}

function toEntity(row: CitationRow): CitationEntity {
  return {
    id: row.id,
    brandId: row.brand_id,
    domain: row.domain,
    url: row.url,
    model: row.provider ?? "unknown",
    createdAt: row.created_at,
  };
}

export class CitationsRepository extends BaseRepository<
  CitationEntity,
  CitationCreateInput,
  CitationUpdateInput
> {
  async findById(id: string): Promise<CitationEntity | null> {
    if (this.isDemoMode()) {
      const found = DEMO_CITATIONS.find((c) => c.id === id);
      return found ?? null;
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase.from("citations").select("*").eq("id", id).maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return toEntity(data as CitationRow);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<CitationEntity>> {
    const limit = options.pagination?.limit ?? 20;
    const offset = options.pagination?.offset ?? 0;
    const brandFilter = options.filters?.brandId as string | undefined;

    if (this.isDemoMode()) {
      let items = DEMO_CITATIONS.map((c) => ({ ...c }));
      if (brandFilter) {
        items = items.filter((c) => c.brandId === brandFilter);
      }
      return this.paginateArray(items, { limit, offset });
    }

    const supabase = await this.getClient();
    let query = supabase
      .from("citations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (brandFilter) {
      query = query.eq("brand_id", brandFilter);
    }
    const { data, error, count } = await query;
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as CitationRow[];
    return {
      items: rows.map(toEntity),
      total: count ?? rows.length,
    };
  }

  async create(input: CitationCreateInput): Promise<CitationEntity> {
    if (this.isDemoMode()) {
      return {
        id: crypto.randomUUID(),
        brandId: input.brandId,
        domain: input.domain,
        url: input.url,
        model: input.model,
        createdAt: new Date().toISOString(),
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("citations")
      .insert({
        brand_id: input.brandId,
        domain: input.domain,
        url: input.url,
        provider: input.model,
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toEntity(data as CitationRow);
  }

  async update(id: string, input: CitationUpdateInput): Promise<CitationEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new DatabaseError("Citation not found");
    if (this.isDemoMode()) {
      return {
        ...existing,
        domain: input.domain ?? existing.domain,
        url: input.url ?? existing.url,
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("citations")
      .update({
        domain: input.domain,
        url: input.url,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toEntity(data as CitationRow);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      return DEMO_CITATIONS.some((c) => c.id === id);
    }
    const supabase = await this.getClient();
    const { error } = await supabase.from("citations").delete().eq("id", id);
    if (error) throw new DatabaseError(error.message);
    return true;
  }
}
