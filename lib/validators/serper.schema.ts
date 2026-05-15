import { z } from "zod";

export const serperSearchBodySchema = z.object({
  q: z.string().min(1).max(500),
  num: z.coerce.number().int().min(1).max(100).optional().default(10),
  gl: z.string().min(2).max(8).optional(),
  hl: z.string().min(2).max(8).optional(),
});

export const serperCheckRankingBodySchema = z.object({
  brandId: z.string().min(1).max(64),
  keywords: z.array(z.string().min(1).max(500)).max(25).optional(),
  includeCompetitors: z.boolean().optional().default(true),
  gl: z.string().min(2).max(8).optional(),
  hl: z.string().min(2).max(8).optional(),
});
