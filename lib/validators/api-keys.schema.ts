import { z } from "zod";

export const apiKeyProviderSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "google_search_console",
  "google_analytics",
]);

export const createUserApiKeySchema = z.object({
  provider: apiKeyProviderSchema,
  keyName: z.string().trim().min(1).max(120),
  apiKey: z.string().min(8).max(8192),
  testBeforeSave: z.boolean().optional().default(true),
});

export type ApiKeyProvider = z.infer<typeof apiKeyProviderSchema>;
export type CreateUserApiKeyInput = z.infer<typeof createUserApiKeySchema>;
