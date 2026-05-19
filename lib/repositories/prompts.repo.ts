import { DEMO_BRAND_ID, DEMO_PROMPTS } from "@/lib/demo/seed-data";
import type { PromptRow } from "@/lib/supabase/types";
import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";
import { DatabaseError } from "@/lib/repositories/errors";

export interface PromptEntity {
  id: string;
  brandId: string;
  text: string;
  category: string;
  visibility: boolean;
  sentiment: number | null;
  lastRun: string;
}

export interface PromptCreateInput {
  text: string;
  category: string;
  brandId: string;
  userId?: string;
  tags?: string[];
}

export interface PromptUpdateInput {
  text?: string;
  category?: string;
  isActive?: boolean;
  tags?: string[];
}

function toPromptEntity(row: PromptRow): PromptEntity {
  return {
    id: row.id,
    brandId: row.brand_id,
    text: row.text,
    category: row.category ?? "general",
    visibility: false,
    sentiment: null,
    lastRun: row.created_at,
  };
}

function sortPrompts(items: PromptEntity[], sortBy: string, sortOrder: "asc" | "desc") {
  return [...items].sort((a, b) => {
    if (sortBy === "text") {
      return sortOrder === "asc"
        ? a.text.localeCompare(b.text)
        : b.text.localeCompare(a.text);
    }
    const left = new Date(a.lastRun).getTime();
    const right = new Date(b.lastRun).getTime();
    return sortOrder === "asc" ? left - right : right - left;
  });
}

export class PromptsRepository extends BaseRepository<
  PromptEntity,
  PromptCreateInput,
  PromptUpdateInput
> {
  async findById(id: string): Promise<PromptEntity | null> {
    if (this.isDemoMode()) {
      const found = DEMO_PROMPTS.find((item) => item.id === id);
      return found
        ? {
            id: found.id,
            brandId: DEMO_BRAND_ID,
            text: found.text,
            category: found.category,
            visibility: found.visibility,
            sentiment: found.sentiment,
            lastRun: found.lastRun,
          }
        : null;
    }

    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return toPromptEntity(data as PromptRow);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<PromptEntity>> {
    const pagination = options.pagination ?? {};
    const limit = pagination.limit ?? 20;
    const offset = pagination.offset ?? 0;
    const sortBy = options.sortBy ?? "created_at";
    const sortOrder = options.sortOrder ?? "desc";

    const brandId = options.filters?.brandId ? String(options.filters.brandId) : null;
    if (!brandId) {
      return { items: [], total: 0 };
    }

    if (this.isDemoMode()) {
      const filtered = DEMO_PROMPTS
        .filter((item) =>
          options.search ? item.text.toLowerCase().includes(options.search.toLowerCase()) : true,
        )
        .filter((item) =>
          options.filters?.category
            ? item.category.toLowerCase() === String(options.filters.category).toLowerCase()
            : true,
        )
        .filter(() => brandId === DEMO_BRAND_ID)
        .map((item) => ({
          id: item.id,
          brandId: DEMO_BRAND_ID,
          text: item.text,
          category: item.category,
          visibility: item.visibility,
          sentiment: item.sentiment,
          lastRun: item.lastRun,
        }));
      const sorted = sortPrompts(filtered, sortBy, sortOrder);
      return this.paginateArray(sorted, { limit, offset });
    }

    const supabase = await this.getClient();
    let query = supabase
      .from("prompts")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order(sortBy === "text" ? "text" : "created_at", { ascending: sortOrder === "asc" });
    if (options.search) query = query.ilike("text", `%${options.search}%`);
    query = query.eq("brand_id", brandId);
    if (options.filters?.is_active !== undefined) {
      query = query.eq("is_active", Boolean(options.filters.is_active));
    }
    if (options.filters?.category) {
      query = query.eq("category", String(options.filters.category));
    }
    const { data, error, count } = await query;
    if (error) throw new DatabaseError(error.message);

    const rows = (data ?? []) as PromptRow[];
    return {
      items: rows.map(toPromptEntity),
      total: count ?? rows.length,
    };
  }

  async create(input: PromptCreateInput): Promise<PromptEntity> {
    if (this.isDemoMode()) {
      const created: PromptEntity = {
        id: crypto.randomUUID(),
        brandId: input.brandId ?? DEMO_BRAND_ID,
        text: input.text,
        category: input.category,
        visibility: false,
        sentiment: null,
        lastRun: new Date().toISOString(),
      };
      DEMO_PROMPTS.unshift({
        id: created.id,
        text: created.text,
        category: created.category,
        visibility: created.visibility,
        sentiment: created.sentiment,
        lastRun: created.lastRun,
      });
      return created;
    }

    const brandId = input.brandId;
    if (!brandId) {
      throw new DatabaseError("brandId is required to create a prompt");
    }

    const supabase = await this.getClient();

    if (input.userId) {
      const { data: owned, error: brandErr } = await supabase
        .from("brands")
        .select("id")
        .eq("id", brandId)
        .eq("user_id", input.userId)
        .maybeSingle();
      if (brandErr) throw new DatabaseError(brandErr.message);
      if (!owned) throw new DatabaseError("Brand not found or access denied");
    }

    const { data, error } = await supabase
      .from("prompts")
      .insert({
        brand_id: brandId,
        text: input.text,
        category: input.category,
        tags: input.tags ?? [],
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toPromptEntity(data as PromptRow);
  }

  async update(id: string, input: PromptUpdateInput): Promise<PromptEntity> {
    if (this.isDemoMode()) {
      const index = DEMO_PROMPTS.findIndex((item) => item.id === id);
      if (index === -1) throw new DatabaseError("Prompt not found");
      const next = {
        ...DEMO_PROMPTS[index],
        text: input.text ?? DEMO_PROMPTS[index].text,
        category: input.category ?? DEMO_PROMPTS[index].category,
      };
      DEMO_PROMPTS[index] = next;
      return {
        id: next.id,
        brandId: DEMO_BRAND_ID,
        text: next.text,
        category: next.category,
        visibility: next.visibility,
        sentiment: next.sentiment,
        lastRun: next.lastRun,
      };
    }

    const supabase = await this.getClient();
    const payload: Record<string, unknown> = {};
    if (input.text !== undefined) payload.text = input.text;
    if (input.category !== undefined) payload.category = input.category;
    if (input.tags !== undefined) payload.tags = input.tags;
    if (input.isActive !== undefined) payload.is_active = input.isActive;
    const { data, error } = await supabase
      .from("prompts")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toPromptEntity(data as PromptRow);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      const index = DEMO_PROMPTS.findIndex((item) => item.id === id);
      if (index === -1) return false;
      DEMO_PROMPTS.splice(index, 1);
      return true;
    }

    const supabase = await this.getClient();
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (error) throw new DatabaseError(error.message);
    return true;
  }
}
