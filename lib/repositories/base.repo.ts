import { isAuthBypassMode } from "@/lib/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

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
}
