import { DEMO_COMPETITORS } from "@/lib/demo/seed-data";
import type { CompetitorRow } from "@/lib/supabase/types";
import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";
import { DatabaseError } from "@/lib/repositories/errors";

export interface CompetitorEntity {
  id: string;
  name: string;
  visibility: number;
  sentiment: number;
  position: number;
  trend: "up" | "down" | "neutral";
}

export interface CompetitorCreateInput {
  name: string;
  brandId?: string;
}

export interface CompetitorUpdateInput {
  name?: string;
}

function toCompetitorEntity(row: CompetitorRow): CompetitorEntity {
  return {
    id: row.id,
    name: row.competitor_name,
    visibility: 0,
    sentiment: 50,
    position: 0,
    trend: "neutral",
  };
}

export class CompetitorsRepository extends BaseRepository<
  CompetitorEntity,
  CompetitorCreateInput,
  CompetitorUpdateInput
> {
  async findById(id: string): Promise<CompetitorEntity | null> {
    if (this.isDemoMode()) {
      const found = DEMO_COMPETITORS.find((item) => item.id === id || item.name === id);
      return found
        ? {
            id: found.id,
            name: found.name,
            visibility: found.visibility,
            sentiment: found.sentiment,
            position: found.position,
            trend: found.trend,
          }
        : null;
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return toCompetitorEntity(data as CompetitorRow);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<CompetitorEntity>> {
    const limit = options.pagination?.limit ?? 20;
    const offset = options.pagination?.offset ?? 0;
    const sortOrder = options.sortOrder ?? "desc";

    if (this.isDemoMode()) {
      const filtered = DEMO_COMPETITORS
        .filter((item) =>
          options.search ? item.name.toLowerCase().includes(options.search.toLowerCase()) : true,
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          visibility: item.visibility,
          sentiment: item.sentiment,
          position: item.position,
          trend: item.trend,
        }))
        .sort((a, b) =>
          sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
        );
      return this.paginateArray(filtered, { limit, offset });
    }

    const supabase = await this.getClient();
    let query = supabase
      .from("competitors")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: sortOrder === "asc" });
    if (options.search) query = query.ilike("competitor_name", `%${options.search}%`);
    const { data, error, count } = await query;
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as CompetitorRow[];
    return { items: rows.map(toCompetitorEntity), total: count ?? rows.length };
  }

  async create(input: CompetitorCreateInput): Promise<CompetitorEntity> {
    if (this.isDemoMode()) {
      const created: CompetitorEntity = {
        id: crypto.randomUUID(),
        name: input.name,
        visibility: 42,
        sentiment: 58,
        position: 3.2,
        trend: "neutral",
      };
      DEMO_COMPETITORS.push({
        id: created.id,
        name: created.name,
        visibility: created.visibility,
        sentiment: created.sentiment,
        position: created.position,
        trend: created.trend,
      });
      return created;
    }

    const supabase = await this.getClient();
    let brandId = input.brandId;
    if (!brandId) {
      const { data: firstBrand, error: brandError } = await supabase
        .from("brands")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (brandError) throw new DatabaseError(brandError.message);
      brandId = firstBrand?.id;
    }
    if (!brandId) throw new DatabaseError("No brand available for competitor creation");
    const { data, error } = await supabase
      .from("competitors")
      .insert({ brand_id: brandId, competitor_name: input.name })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toCompetitorEntity(data as CompetitorRow);
  }

  async update(id: string, input: CompetitorUpdateInput): Promise<CompetitorEntity> {
    if (this.isDemoMode()) {
      const index = DEMO_COMPETITORS.findIndex((item) => item.id === id || item.name === id);
      if (index === -1) throw new DatabaseError("Competitor not found");
      const updated = {
        ...DEMO_COMPETITORS[index],
        name: input.name ?? DEMO_COMPETITORS[index].name,
      };
      DEMO_COMPETITORS[index] = updated;
      return {
        id: updated.id,
        name: updated.name,
        visibility: updated.visibility,
        sentiment: updated.sentiment,
        position: updated.position,
        trend: updated.trend,
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("competitors")
      .update({ competitor_name: input.name })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toCompetitorEntity(data as CompetitorRow);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      const index = DEMO_COMPETITORS.findIndex((item) => item.id === id || item.name === id);
      if (index === -1) return false;
      DEMO_COMPETITORS.splice(index, 1);
      return true;
    }
    const supabase = await this.getClient();
    const { error } = await supabase.from("competitors").delete().eq("id", id);
    if (error) throw new DatabaseError(error.message);
    return true;
  }
}
