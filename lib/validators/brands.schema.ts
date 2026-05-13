import { z } from "zod";
import { countryCodeSchema, domainSchema, urlSchema } from "@/lib/validators/common.schema";

export const brandIndustrySchema = z.enum([
  "saas",
  "ecommerce",
  "fintech",
  "healthcare",
  "education",
  "agency",
  "marketplace",
  "media",
  "other",
]);

export const createBrandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  domain: domainSchema,
  website: urlSchema,
  description: z.string().trim().min(2).max(600).optional(),
  industry: brandIndustrySchema,
  targetCountries: z.array(countryCodeSchema).min(1).max(50),
  aliases: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
});

/** Minimal client create (sidebar “Add new client”) */
export const quickClientBrandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  domain: domainSchema,
  website: z
    .union([z.literal(""), urlSchema])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const updateBrandSchema = createBrandSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type BrandIndustry = z.infer<typeof brandIndustrySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
