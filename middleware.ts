import { type NextRequest, NextResponse } from "next/server";
import { isAuthBypassMode } from "@/lib/config";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

/** Paths under /api that skip auth (webhooks verify signatures in-route; health for probes). */
function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron")
  );
}

function isPublicAppPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth/callback")
  );
}

export async function middleware(request: NextRequest) {
  try {
    const requestId = crypto.randomUUID();
    const pathname = request.nextUrl.pathname;

    const attachRequestId = (res: NextResponse) => {
      res.headers.set("x-request-id", requestId);
      return res;
    };

    const hiddenFromClients = [
      "/dashboard/settings/api-keys",
      "/dashboard/settings/billing",
      "/dashboard/billing",
    ];
    if (hiddenFromClients.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return attachRequestId(NextResponse.redirect(new URL("/dashboard", request.url)));
    }

    if (pathname === "/") {
      return attachRequestId(NextResponse.redirect(new URL("/login", request.url)));
    }

    if (isAuthBypassMode()) {
      return attachRequestId(NextResponse.next({ request }));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      if (pathname.startsWith("/dashboard")) {
        return attachRequestId(NextResponse.redirect(new URL("/login", request.url)));
      }
      if (pathname.startsWith("/api") && !isPublicApiPath(pathname)) {
        return NextResponse.json(
          { error: "Server misconfigured", requestId },
          { status: 503, headers: { "content-type": "application/json", "x-request-id": requestId } },
        );
      }
      return attachRequestId(NextResponse.next({ request }));
    }

    const { response, user } = await refreshSupabaseSession(request);

    if (isPublicAppPath(pathname)) {
      return attachRequestId(response);
    }

    if (pathname.startsWith("/api")) {
      if (isPublicApiPath(pathname)) {
        return attachRequestId(response);
      }
      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized", requestId },
          {
            status: 401,
            headers: {
              "content-type": "application/json",
              "x-request-id": requestId,
            },
          },
        );
      }
      return attachRequestId(response);
    }

    if (pathname.startsWith("/dashboard")) {
      if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
        return attachRequestId(NextResponse.redirect(loginUrl));
      }
      return attachRequestId(response);
    }

    return attachRequestId(response);
  } catch (e) {
    console.error("[middleware] Unhandled error:", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
