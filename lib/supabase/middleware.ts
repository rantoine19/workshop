import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side session age check (HIPAA defense-in-depth).
  // Reject sessions older than 15 minutes since last activity,
  // enforcing the same timeout as the client-side auto-logout.
  const MAX_SESSION_AGE_MS = 15 * 60 * 1000; // 15 minutes
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const lastRefreshed = session.expires_at
        ? session.expires_at * 1000 - 3600 * 1000 // expires_at minus default 1h TTL = approx last refresh
        : 0;
      const sessionAge = Date.now() - lastRefreshed;
      if (sessionAge > MAX_SESSION_AGE_MS + 3600 * 1000) {
        // Session is stale beyond the max age plus the Supabase TTL buffer —
        // sign the user out and redirect to login.
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("reason", "session_expired");
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect unauthenticated users to login (except public routes)
  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname.startsWith("/api/health") ||
    request.nextUrl.pathname.startsWith("/api/auth/");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith("/auth/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
