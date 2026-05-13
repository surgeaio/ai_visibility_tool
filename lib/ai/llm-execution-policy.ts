import { isStrictLlmExecution } from "@/lib/config";

export class MissingLlmApiKeyError extends Error {
  readonly code = "MISSING_LLM_API_KEY" as const;

  constructor(provider: string) {
    super(
      `No API key for "${provider}". Configure env or user keys, or set STRICT_LLM_EXECUTION=false for development.`,
    );
    this.name = "MissingLlmApiKeyError";
  }
}

/** Enforces strict execution: no synthetic LLM output when keys are absent. */
export function assertLlmKeyOrAllowDemo(provider: string, resolvedKey: string | undefined | null): void {
  if (resolvedKey?.trim()) return;
  if (isStrictLlmExecution()) throw new MissingLlmApiKeyError(provider);
}
