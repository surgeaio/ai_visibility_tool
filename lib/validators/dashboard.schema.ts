import { z } from "zod";

export const dashboardOverviewQuerySchema = z.object({
  brandId: z.string().min(1).max(64),
  range: z.enum(["7d", "30d", "90d"]).optional().default("30d"),
});
