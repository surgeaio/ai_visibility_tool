import type { BrandRow } from "@/lib/supabase/types";
import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";
import { DatabaseError } from "@/lib/repositories/errors";
import { DEMO_BRAND } from "@/lib/demo-data";

export interface BrandEntity {
  id: string;
  name: string;
  website: string | null;
  category: string | null;
  createdAt: string;
}

export interface BrandCreateInput {
  name: string;
  website?: string;
  category?: string;
}

export interface BrandUpdateInput {
  name?: string;
  website?: string;
  category?: string;
}

function toBrandEntity(row: BrandRow): BrandEntity {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    category: row.category,
    createdAt: row.created_at,
  };
}

export class BrandsRepository extends BaseRepository<
  BrandEntity,
  BrandCreateInput,
  BrandUpdateInput
> {
  async findById(id: string): Promise<BrandEntity | null> {
    if (this.isDemoMode()) {
      return {
        id: "demo-brand",
        name: DEMO_BRAND.name,
        website: "https://attio.com",
        category: DEMO_BRAND.category,
        createdAt: new Date().toISOString(),
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return toBrandEntity(data as BrandRow);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<BrandEntity>> {
    const limit = options.pagination?.limit ?? 20;
    const offset = options.pagination?.offset ?? 0;
    if (this.isDemoMode()) {
      return {
        items: [
          {
            id: "demo-brand",
            name: DEMO_BRAND.name,
            website: "https://attio.com",
            category: DEMO_BRAND.category,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      };
    }
    const supabase = await this.getClient();
    const { data, error, count } = await supabase
      .from("brands")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as BrandRow[];
    return { items: rows.map(toBrandEntity), total: count ?? rows.length };
  }

  async create(input: BrandCreateInput): Promise<BrandEntity> {
    if (this.isDemoMode()) {
      return {
        id: crypto.randomUUID(),
        name: input.name,
        website: input.website ?? null,
        category: input.category ?? null,
        createdAt: new Date().toISOString(),
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("brands")
      .insert({
        name: input.name,
        website: input.website ?? null,
        category: input.category ?? null,
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toBrandEntity(data as BrandRow);
  }

  async update(id: string, input: BrandUpdateInput): Promise<BrandEntity> {
    if (this.isDemoMode()) {
      const found = await this.findById(id);
      if (!found) throw new DatabaseError("Brand not found");
      return {
        ...found,
        name: input.name ?? found.name,
        website: input.website ?? found.website,
        category: input.category ?? found.category,
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("brands")
      .update({
        name: input.name,
        website: input.website,
        category: input.category,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toBrandEntity(data as BrandRow);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isDemoMode()) return true;
    const supabase = await this.getClient();
    const { error } = await supabase.from("brands").delete().eq("id", id);
    if (error) throw new DatabaseError(error.message);
    return true;
  }
}
