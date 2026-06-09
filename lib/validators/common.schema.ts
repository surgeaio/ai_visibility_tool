import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().min(1).optional(),
});

export const sortOrderSchema = z.enum(["asc", "desc"]);

export const isoDateSchema = z.string().datetime({ offset: true });

export const dateRangeSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const aiModelSchema = z.enum(["openai", "anthropic", "gemini"]);

export const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/);

export const urlSchema = z.string().url();

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/);

export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
