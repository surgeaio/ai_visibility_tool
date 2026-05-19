import { z } from "zod";

export const llmVisibilityQuerySchema = z.object({
  brandId: z.string().min(1),
  brandIds: z.string().optional(),
  range: z.enum(["7d", "14d", "30d", "90d"]).optional().default("7d"),
  models: z.string().optional(),
  promptIds: z.string().optional(),
  focusPromptId: z.string().optional(),
});

export type LlmVisibilityQuery = z.infer<typeof llmVisibilityQuerySchema>;
