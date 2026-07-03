import { NextRequest, NextResponse } from "next/server";
import { adminAuthEnabled, expectedToken, SESSION_COOKIE } from "@/lib/auth";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(req: NextRequest) {
  // Auth disabled (no ADMIN_PASSWORD) — leave everything open (local dev).
  if (!adminAuthEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // The login page itself must stay reachable.
  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await expectedToken();
  const authed = !!token && !!expected && token === expected;

  // API: only guard mutating requests; reads (GET) remain public.
  if (pathname.startsWith("/api/")) {
    if (MUTATING.has(req.method) && !authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin pages: redirect to login when not authenticated.
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/lineups/:path*", "/api/rotation/:path*"],
};
