import { DEMO_RECOMMENDATIONS } from "@/lib/demo-data";
import type { RecommendationRow } from "@/lib/supabase/types";
import {
  BaseRepository,
  DatabaseError,
  type PaginatedResult,
  type QueryOptions,
} from "@/lib/repositories/base.repo";

export interface RecommendationEntity {
  id: string;
  pattern: string;
  title: string;
  actions: string[];
  impact: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "dismissed";
  category: "content" | "technical" | "authority" | "positioning" | "geo";
}

export interface RecommendationCreateInput {
  brandId: string;
  pattern: string;
  title: string;
  action: string;
  priority: RecommendationEntity["priority"];
}

export interface RecommendationUpdateInput {
  status?: RecommendationEntity["status"];
}

const doneRecommendationIds = new Set<string>();
const adHocDemoRecommendations: RecommendationEntity[] = [];

function mapPriority(value: string | null): RecommendationEntity["priority"] {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function mapStatus(value: string | null): RecommendationEntity["status"] {
  if (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "dismissed"
  ) {
    return value;
  }
  return "pending";
}

function mapDemoPriority(value: "high" | "medium" | "low"): RecommendationEntity["priority"] {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function toRecommendationEntity(row: RecommendationRow): RecommendationEntity {
  return {
    id: row.id,
    pattern: row.pattern_type ?? "unknown",
    title: row.action ?? "Recommendation",
    actions: row.action ? [row.action] : [],
    impact: "+0",
    priority: mapPriority(row.priority),
    status: mapStatus(row.status),
    category: "content",
  };
}

export class RecommendationsRepository extends BaseRepository<
  RecommendationEntity,
  RecommendationCreateInput,
  RecommendationUpdateInput
> {
  async findById(id: string): Promise<RecommendationEntity | null> {
    if (this.isDemoMode()) {
      const extra = adHocDemoRecommendations.find((item) => item.id === id);
      if (extra) return extra;
      const found = DEMO_RECOMMENDATIONS.find((item) => item.id === id);
      if (!found) return null;
      return {
        id: found.id,
        pattern: found.pattern,
        title: found.title,
        actions: found.actions,
        impact: found.impact,
        priority: mapDemoPriority(found.priority),
        status:
          doneRecommendationIds.has(found.id) || found.status === "done"
            ? "completed"
            : "pending",
        category: "content",
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return toRecommendationEntity(data as RecommendationRow);
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<RecommendationEntity>> {
    const limit = options.pagination?.limit ?? 20;
    const offset = options.pagination?.offset ?? 0;
    const sortOrder = options.sortOrder ?? "desc";
    const sortBy = options.sortBy ?? "created_at";

    if (this.isDemoMode()) {
      const list: RecommendationEntity[] = [
        ...adHocDemoRecommendations,
        ...DEMO_RECOMMENDATIONS.map((item) => ({
        id: item.id,
        pattern: item.pattern,
        title: item.title,
        actions: item.actions,
        impact: item.impact,
        priority: mapDemoPriority(item.priority),
        status: (
          doneRecommendationIds.has(item.id) || item.status === "done"
            ? "completed"
            : "pending"
        ) as RecommendationEntity["status"],
        category: "content" as const,
        })),
      ]
        .filter((item) =>
          options.search ? item.title.toLowerCase().includes(options.search.toLowerCase()) : true,
        )
        .filter((item) =>
          options.filters?.status ? item.status === options.filters.status : true,
        )
        .filter((item) =>
          options.filters?.priority ? item.priority === options.filters.priority : true,
        )
        .sort((a, b) => {
          if (sortBy === "priority") {
            const score = { critical: 4, high: 3, medium: 2, low: 1 } as const;
            const left = score[a.priority];
            const right = score[b.priority];
            return sortOrder === "asc" ? left - right : right - left;
          }
          return sortOrder === "asc" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
        });
      return this.paginateArray(list, { limit, offset });
    }

    const supabase = await this.getClient();
    let query = supabase
      .from("recommendations")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order(sortBy === "priority" ? "priority" : "created_at", {
        ascending: sortOrder === "asc",
      });
    if (options.search) query = query.ilike("action", `%${options.search}%`);
    if (options.filters?.status) query = query.eq("status", String(options.filters.status));
    if (options.filters?.priority) {
      query = query.eq("priority", String(options.filters.priority));
    }
    const { data, error, count } = await query;
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as RecommendationRow[];
    return { items: rows.map(toRecommendationEntity), total: count ?? rows.length };
  }

  async create(input: RecommendationCreateInput): Promise<RecommendationEntity> {
    if (this.isDemoMode()) {
      const created: RecommendationEntity = {
        id: crypto.randomUUID(),
        pattern: input.pattern,
        title: input.title,
        actions: [input.action],
        impact: "+0",
        priority: input.priority,
        status: "pending",
        category: "content",
      };
      adHocDemoRecommendations.unshift(created);
      return created;
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("recommendations")
      .insert({
        brand_id: input.brandId,
        pattern_type: input.pattern,
        action: input.action,
        priority: input.priority,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toRecommendationEntity(data as RecommendationRow);
  }

  async update(id: string, input: RecommendationUpdateInput): Promise<RecommendationEntity> {
    if (this.isDemoMode()) {
      const extraIdx = adHocDemoRecommendations.findIndex((item) => item.id === id);
      if (extraIdx !== -1) {
        const current = adHocDemoRecommendations[extraIdx];
        adHocDemoRecommendations[extraIdx] = {
          ...current,
          status: input.status ?? current.status,
        };
        return adHocDemoRecommendations[extraIdx];
      }
      if (input.status === "completed") doneRecommendationIds.add(id);
      if (input.status && input.status !== "completed") doneRecommendationIds.delete(id);
      const found = await this.findById(id);
      if (!found) throw new DatabaseError("Recommendation not found");
      return {
        ...found,
        status: input.status ?? found.status,
      };
    }
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("recommendations")
      .update({ status: input.status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    return toRecommendationEntity(data as RecommendationRow);
  }

  async delete(id: string): Promise<boolean> {
    if (this.isDemoMode()) {
      const extraIdx = adHocDemoRecommendations.findIndex((item) => item.id === id);
      if (extraIdx !== -1) {
        adHocDemoRecommendations.splice(extraIdx, 1);
        doneRecommendationIds.delete(id);
        return true;
      }
      const index = DEMO_RECOMMENDATIONS.findIndex((item) => item.id === id);
      if (index === -1) return false;
      DEMO_RECOMMENDATIONS.splice(index, 1);
      doneRecommendationIds.delete(id);
      return true;
    }
    const supabase = await this.getClient();
    const { error } = await supabase.from("recommendations").delete().eq("id", id);
    if (error) throw new DatabaseError(error.message);
    return true;
  }
}
