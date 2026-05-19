/** Returns true when public Supabase URL + anon key are configured (required for auth/session routes). */
export function hasPublicSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

/** Returns true when service-role key is configured (admin/server writes). */
export function hasAdminSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function missingSupabaseResponse(): Response {
  return Response.json({ error: "Missing Supabase environment variables" }, { status: 500 });
}
