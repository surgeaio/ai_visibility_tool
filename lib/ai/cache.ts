import { createHash } from "crypto";

const memory = new Map<string, { expiresAt: number; value: string }>();

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function makeAICacheKey(input: {
  provider: string;
  model: string;
  prompt: string;
  temperature?: number;
}) {
  return `${input.provider}:${input.model}:${input.temperature ?? 0.2}:${input.prompt}`;
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const hashed = hashKey(key);
  const entry = memory.get(hashed);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(hashed);
    return null;
  }
  return entry.value;
}

export async function setCachedResponse(
  key: string,
  value: string,
  ttlSeconds = 3600,
): Promise<void> {
  const hashed = hashKey(key);
  memory.set(hashed, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
