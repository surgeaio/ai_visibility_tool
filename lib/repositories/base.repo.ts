import { isAuthBypassMode } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface QueryOptions {
  pagination?: PaginationOptions;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, string | number | boolean | null | undefined>;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
}

export abstract class BaseRepository<TItem, TCreate, TUpdate> {
  protected isDemoMode(): boolean {
    return isAuthBypassMode();
  }

  protected async getClient() {
    return createServerSupabaseClient();
  }

  protected paginateArray<T>(items: T[], options: PaginationOptions): PaginatedResult<T> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    return {
      items: items.slice(offset, offset + limit),
      total: items.length,
    };
  }

  abstract findById(id: string): Promise<TItem | null>;
  abstract findMany(options: QueryOptions): Promise<PaginatedResult<TItem>>;
  abstract create(input: TCreate): Promise<TItem>;
  abstract update(id: string, input: TUpdate): Promise<TItem>;
  abstract delete(id: string): Promise<boolean>;

  /** Delegates to `findMany` with `brandId` merged into filters. */
  async findManyByBrand(brandId: string, options: QueryOptions = {}): Promise<PaginatedResult<TItem>> {
    return this.findMany({
      ...options,
      filters: { ...options.filters, brandId },
    });
  }

  /** Delegates to `findMany` with `orgId` merged into filters (repos may ignore until org scoping lands). */
  async findManyByOrg(orgId: string, options: QueryOptions = {}): Promise<PaginatedResult<TItem>> {
    return this.findMany({
      ...options,
      filters: { ...options.filters, orgId },
    });
  }

  /** Total matching rows; default uses `findMany` total (override for efficient SQL COUNT). */
  async count(filters?: Record<string, string | number | boolean | null | undefined>): Promise<number> {
    const { total } = await this.findMany({
      pagination: { limit: 1, offset: 0 },
      filters,
    });
    return total;
  }
}
