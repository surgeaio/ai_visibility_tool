import { z } from "zod";
import { paginationSchema } from "@/lib/validators/common.schema";

export const listCitationsQuerySchema = paginationSchema.extend({
  brandId: z.string().min(1).optional(),
});

export type ListCitationsQueryInput = z.infer<typeof listCitationsQuerySchema>;
