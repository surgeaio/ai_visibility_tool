import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";

export interface AnalyticsMetricEntity {
  id: string;
  brandId: string;
  date: string;
  visibility: number;
  sentiment: number;
  position: number;
}

export interface AnalyticsCreateInput {
  brandId: string;
  date: string;
  visibility: number;
  sentiment: number;
  position: number;
}

export interface AnalyticsUpdateInput {
  visibility?: number;
  sentiment?: number;
  position?: number;
}

export class AnalyticsRepository extends BaseRepository<
  AnalyticsMetricEntity,
  AnalyticsCreateInput,
  AnalyticsUpdateInput
> {
  async findById(id: string): Promise<AnalyticsMetricEntity | null> {
    void id;
    return null;
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<AnalyticsMetricEntity>> {
    void options;
    return { items: [], total: 0 };
  }

  async create(input: AnalyticsCreateInput): Promise<AnalyticsMetricEntity> {
    return {
      id: crypto.randomUUID(),
      brandId: input.brandId,
      date: input.date,
      visibility: input.visibility,
      sentiment: input.sentiment,
      position: input.position,
    };
  }

  async update(id: string, input: AnalyticsUpdateInput): Promise<AnalyticsMetricEntity> {
    return {
      id,
      brandId: "unknown",
      date: new Date().toISOString(),
      visibility: input.visibility ?? 0,
      sentiment: input.sentiment ?? 0,
      position: input.position ?? 0,
    };
  }

  async delete(id: string): Promise<boolean> {
    void id;
    return true;
  }
}
