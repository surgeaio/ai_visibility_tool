import { z } from "zod";
import { googleRankingsQuerySchema } from "@/lib/validators/google-rankings.schema";

export const analyticsQuerySchema = googleRankingsQuerySchema;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
