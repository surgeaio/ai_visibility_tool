import { z } from "zod";
import {
  aiModelSchema,
  countryCodeSchema,
  paginationSchema,
  sortOrderSchema,
  uuidSchema,
} from "@/lib/validators/common.schema";

export const promptCategorySchema = z.enum([
  "commercial",
  "comparison",
  "problem_solving",
  "recommendation",
  "alternative",
  "industry_specific",
  "geo_ai_search",
  "feature_based",
  "general",
]);

export const promptFrequencySchema = z.enum(["manual", "hourly", "daily", "weekly"]);

export const createPromptSchema = z.object({
  text: z.string().trim().min(5).max(500),
  category: promptCategorySchema,
  frequency: promptFrequencySchema.default("manual"),
  models: z.array(aiModelSchema).min(1),
  country: countryCodeSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  brandId: uuidSchema,
});

export const updatePromptSchema = createPromptSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const listPromptsQuerySchema = paginationSchema.extend({
  brandId: uuidSchema,
  category: promptCategorySchema.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  sortBy: z.enum(["created_at", "text", "last_run"]).default("created_at"),
  sortOrder: sortOrderSchema.default("desc"),
});

export const runPromptSchema = z.object({
  promptId: uuidSchema,
  models: z.array(aiModelSchema).min(1).optional(),
});

export const promptIdParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * Temporary compatibility schema for current dashboard form payload
 * until Sprint A.4 fully migrates UI + persistence payload shape.
 */
export const createPromptApiSchema = z.object({
  text: z.string().trim().min(5).max(500),
  category: z.string().trim().min(1).max(80).default("general"),
  brandId: uuidSchema,
});

export type PromptCategory = z.infer<typeof promptCategorySchema>;
export type PromptFrequency = z.infer<typeof promptFrequencySchema>;
export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
export type ListPromptsQuery = z.infer<typeof listPromptsQuerySchema>;
export type RunPromptInput = z.infer<typeof runPromptSchema>;
export type PromptIdParam = z.infer<typeof promptIdParamSchema>;
export type CreatePromptApiInput = z.infer<typeof createPromptApiSchema>;
