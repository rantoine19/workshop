import { updateSession } from "@/lib/supabase/middleware";
import { createRateLimiter, isAuthRoute } from "@/lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

// Single rate limiter instance shared across all requests in this process.
// 5 attempts per minute per IP for auth endpoints.
const authRateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 60_000,
});

// Rate limiter for API endpoints that call Claude or access PHI.
// More generous: 20 requests per minute per IP.
const apiRateLimiter = createRateLimiter({
  maxAttempts: 20,
  windowMs: 60_000,
});

/** Check if a pathname is a rate-limited API route (Claude/PHI endpoints). */
function isRateLimitedApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/parse") ||
    pathname.startsWith("/api/doctor-questions") ||
    pathname.includes("/summary")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Use x-forwarded-for (set by reverse proxies like Render) or fall back
  // to a generic key. Never log the IP with PHI per guardrails.
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  // CSRF protection: validate Origin header on mutation requests
  if (["POST", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      // Allow localhost for local development
      if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }
  }

  // Apply rate limiting to auth routes
  if (isAuthRoute(pathname)) {
    const result = authRateLimiter.check(clientIp);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
          },
        }
      );
    }
  }

  // Apply rate limiting to Claude API / PHI endpoints
  if (isRateLimitedApiRoute(pathname)) {
    const result = apiRateLimiter.check(clientIp);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
          },
        }
      );
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
