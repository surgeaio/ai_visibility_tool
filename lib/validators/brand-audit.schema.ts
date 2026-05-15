import { z } from "zod";

export const brandAuditScrapeSchema = z.object({
  url: z.string().min(1),
  brandName: z.string().min(1).optional(),
});

export const brandAuditLlmSchema = z.object({
  brand: z.string().min(1),
  url: z.string().url().optional(),
  queries: z.array(z.string().min(1)).optional(),
  maxQueries: z.number().int().min(1).max(20).optional(),
});

export const brandAuditFullReportSchema = z.object({
  brand: z.string().min(1),
  url: z.string().url().optional(),
  runLlm: z.boolean().optional().default(true),
  maxLlmQueries: z.number().int().min(1).max(12).optional().default(6),
});
