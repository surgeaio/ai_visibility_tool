import { z } from "zod";

export const googleRankingsQuerySchema = z.object({
  brandId: z.string().min(1),
  range: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
  queriesPage: z.coerce.number().int().min(1).optional().default(1),
  pagesPage: z.coerce.number().int().min(1).optional().default(1),
  page23Page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});
