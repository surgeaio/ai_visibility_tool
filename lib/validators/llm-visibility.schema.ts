import { z } from "zod";

export const llmVisibilityQuerySchema = z.object({
  brandId: z.string().min(1),
  range: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
});

export type LlmVisibilityQuery = z.infer<typeof llmVisibilityQuerySchema>;
