import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "mtl_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Allow auth APIs without session check (they handle their own auth)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check if session cookie exists for page routes
  if (pathname.startsWith("/api/")) {
    // API routes - just pass through, let them handle auth
    return NextResponse.next();
  }

  // Check session for page routes (non-API)
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login).*)",
  ],
};
