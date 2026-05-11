import { z } from "zod";
import {
  aiModelSchema,
  dateRangeSchema,
  uuidSchema,
} from "@/lib/validators/common.schema";

export const analyzeResponseSchema = z.object({
  promptId: uuidSchema,
  brandId: uuidSchema,
  responseText: z.string().trim().min(1),
  model: aiModelSchema,
});

export const analyzeSentimentSchema = z.object({
  text: z.string().trim().min(1),
  brandName: z.string().trim().min(1).max(120),
  context: z.string().trim().max(1000).optional(),
});

export const analyticsQuerySchema = dateRangeSchema.extend({
  brandId: uuidSchema.optional(),
  models: z.array(aiModelSchema).optional(),
  categories: z.array(z.string().trim().min(1).max(100)).optional(),
});

/** Compatibility schema for POST /api/analyze in current implementation. */
export const analyzePromptRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  brandName: z.string().trim().min(1).max(120),
  promptId: uuidSchema.optional(),
  brandId: uuidSchema.optional(),
  competitors: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  models: z
    .array(aiModelSchema)
    .min(1)
    .default(["openai", "anthropic"]),
});

export type AnalyzeResponseInput = z.infer<typeof analyzeResponseSchema>;
export type AnalyzeSentimentInput = z.infer<typeof analyzeSentimentSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type AnalyzePromptRequestInput = z.infer<typeof analyzePromptRequestSchema>;
