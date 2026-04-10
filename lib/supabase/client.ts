import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton browser Supabase client.
 *
 * `createBrowserClient` already deduplicates internally, but caching at module
 * scope avoids the function-call overhead on every render and makes the
 * singleton contract explicit. Safe in the browser because there is exactly one
 * module instance per page load.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
