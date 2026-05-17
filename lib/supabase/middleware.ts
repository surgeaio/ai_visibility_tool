import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { logMiddlewareError } from "@/lib/middleware/log";

type MiddlewareSupabaseResult = {
  response: NextResponse;
  user: User | null;
};

/**
 * Refreshes the Supabase session from cookies and returns a NextResponse that must be used
 * when the user is allowed to continue (so Set-Cookie from refresh is preserved).
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  pathname = request.nextUrl.pathname,
): Promise<MiddlewareSupabaseResult> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return { response, user: null };
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          } catch {
            /* Some runtimes disallow mutating request cookies — response cookies still apply */
          }
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn("[middleware]", {
        path: pathname,
        message: `Supabase getUser: ${error.message}`,
        supabaseUrlSet: true,
        anonKeySet: true,
      });
      return { response, user: null };
    }

    return { response, user };
  } catch (e) {
    logMiddlewareError(pathname, e, { phase: "refreshSupabaseSession" });
    return { response: NextResponse.next({ request }), user: null };
  }
}
