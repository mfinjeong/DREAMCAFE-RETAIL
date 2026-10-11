import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "dreamcafe_session";

const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/sign-up"];
const apiAuthRoutes = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/register",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE);

  const next = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  // Allow public auth routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return next();
  }

  // Allow public API auth routes
  if (apiAuthRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return next();
  }

  // Protect internal pages
  if (!sessionToken && !pathname.startsWith("/api")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect private APIs
  if (!sessionToken && pathname.startsWith("/api")) {
    return NextResponse.json({ success: false, message: "Unauthenticated" }, { status: 401 });
  }

  return next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
