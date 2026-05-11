import { z } from "zod";
import { paginationSchema, sortOrderSchema, uuidSchema } from "@/lib/validators/common.schema";

export const recommendationPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const recommendationCategorySchema = z.enum([
  "content",
  "technical",
  "authority",
  "positioning",
  "geo",
]);
export const recommendationStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "dismissed",
]);

export const listRecommendationsQuerySchema = paginationSchema.extend({
  brandId: uuidSchema.optional(),
  priority: recommendationPrioritySchema.optional(),
  category: recommendationCategorySchema.optional(),
  status: recommendationStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sortBy: z.enum(["created_at", "priority"]).default("created_at"),
  sortOrder: sortOrderSchema.default("desc"),
});

export const updateRecommendationStatusSchema = z.object({
  id: z.string().min(1),
  status: recommendationStatusSchema.default("completed"),
});

export type RecommendationPriority = z.infer<typeof recommendationPrioritySchema>;
export type RecommendationCategory = z.infer<typeof recommendationCategorySchema>;
export type RecommendationStatus = z.infer<typeof recommendationStatusSchema>;
export type ListRecommendationsQuery = z.infer<typeof listRecommendationsQuerySchema>;
export type UpdateRecommendationStatusInput = z.infer<typeof updateRecommendationStatusSchema>;
