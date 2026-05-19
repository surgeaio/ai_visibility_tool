import { z } from "zod";
import { domainSchema, paginationSchema, sortOrderSchema, urlSchema, uuidSchema } from "@/lib/validators/common.schema";

export const createCompetitorSchema = z.object({
  brandId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  domain: domainSchema,
  website: urlSchema.optional(),
  description: z.string().trim().min(2).max(500).optional(),
  aliases: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  isTracked: z.boolean().default(true),
});

export const updateCompetitorSchema = createCompetitorSchema
  .omit({ brandId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const listCompetitorsQuerySchema = paginationSchema.extend({
  brandId: uuidSchema,
  isTracked: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(["name", "created_at"]).default("created_at"),
  sortOrder: sortOrderSchema.default("desc"),
});

export const deleteCompetitorQuerySchema = z.object({
  id: uuidSchema,
  brandId: uuidSchema,
});

/** POST /api/competitors */
export const createCompetitorApiSchema = z.object({
  brandId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  domain: domainSchema.optional(),
});

export type CreateCompetitorInput = z.infer<typeof createCompetitorSchema>;
export type UpdateCompetitorInput = z.infer<typeof updateCompetitorSchema>;
export type ListCompetitorsQuery = z.infer<typeof listCompetitorsQuerySchema>;
export type CreateCompetitorApiInput = z.infer<typeof createCompetitorApiSchema>;
