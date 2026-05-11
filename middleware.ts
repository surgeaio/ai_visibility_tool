import { type NextRequest, NextResponse } from "next/server";
import { isAuthBypassMode } from "@/lib/config";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

/** Paths under /api that skip auth (webhooks verify signatures in-route; health for probes). */
function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/health")
  );
}

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const pathname = request.nextUrl.pathname;

  const attachRequestId = (res: NextResponse) => {
    res.headers.set("x-request-id", requestId);
    return res;
  };

  if (isAuthBypassMode()) {
    return attachRequestId(NextResponse.next({ request }));
  }

  const { response, user } = await refreshSupabaseSession(request);

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
      const redirectRes = NextResponse.redirect(loginUrl);
      return attachRequestId(redirectRes);
    }
    return attachRequestId(response);
  }

  return attachRequestId(response);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
