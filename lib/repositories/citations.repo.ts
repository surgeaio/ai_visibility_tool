import { BaseRepository, type PaginatedResult, type QueryOptions } from "@/lib/repositories/base.repo";

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

export class CitationsRepository extends BaseRepository<
  CitationEntity,
  CitationCreateInput,
  CitationUpdateInput
> {
  async findById(id: string): Promise<CitationEntity | null> {
    void id;
    return null;
  }

  async findMany(options: QueryOptions): Promise<PaginatedResult<CitationEntity>> {
    void options;
    return { items: [], total: 0 };
  }

  async create(input: CitationCreateInput): Promise<CitationEntity> {
    return {
      id: crypto.randomUUID(),
      brandId: input.brandId,
      domain: input.domain,
      url: input.url,
      model: input.model,
      createdAt: new Date().toISOString(),
    };
  }

  async update(id: string, input: CitationUpdateInput): Promise<CitationEntity> {
    return {
      id,
      brandId: "unknown",
      domain: input.domain ?? "unknown",
      url: input.url ?? "unknown",
      model: "unknown",
      createdAt: new Date().toISOString(),
    };
  }

  async delete(id: string): Promise<boolean> {
    void id;
    return true;
  }
}
