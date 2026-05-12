import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

const envSchema = z.object({
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  UPSTASH_REDIS_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  UPSTASH_REDIS_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  DEMO_MODE: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  NEXT_PUBLIC_DEMO_MODE: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  AI_DAILY_BUDGET_USD: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}
