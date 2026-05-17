export function logMiddlewareError(path: string, error: unknown, extra?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[middleware]", {
    path,
    message: err.message,
    stack: err.stack,
    supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    anonKeySet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    ...extra,
  });
}
