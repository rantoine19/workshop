import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Validate redirect target: must be a relative path, no protocol, no double slashes
  const safePath =
    next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
      ? next
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // Return the user to login with an error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
