const cache = new Map<string, { expiresAt: number; value: string }>();

export function makeAICacheKey(input: {
  provider: string;
  model: string;
  prompt: string;
  temperature?: number;
}) {
  return `${input.provider}:${input.model}:${input.temperature ?? 0.2}:${input.prompt}`;
}

export function getCachedResponse(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedResponse(key: string, value: string, ttlMs = 24 * 60 * 60 * 1000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
