import { updateSession } from "@/lib/supabase/middleware";
import { createRateLimiter, isAuthRoute } from "@/lib/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

// Single rate limiter instance shared across all requests in this process.
// 5 attempts per minute per IP for auth endpoints.
const authRateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 60_000,
});

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting to auth routes
  if (isAuthRoute(pathname)) {
    // Use x-forwarded-for (set by reverse proxies like Render) or fall back
    // to a generic key. Never log the IP with PHI per guardrails.
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

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
