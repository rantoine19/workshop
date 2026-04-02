/**
 * In-memory sliding window rate limiter for auth endpoints.
 *
 * Tracks request timestamps per IP using a Map. Old entries are pruned
 * on each check to prevent unbounded memory growth.
 *
 * This is intentionally simple and edge-compatible — no Redis or
 * external dependencies required. The trade-off is that rate limit
 * state is per-process and resets on deploy. For a HIPAA-compliant
 * health app this is acceptable as defense-in-depth alongside
 * Supabase's own rate limits.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  maxAttempts: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of remaining attempts in the current window. */
  remaining: number;
  /** Seconds until the earliest tracked request expires (for Retry-After). */
  retryAfterSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60_000, // 1 minute
};

/**
 * Creates a rate limiter instance with its own in-memory store.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 60_000 });
 *   const result = limiter.check(clientIp);
 *   if (!result.allowed) { return 429 with Retry-After header }
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { maxAttempts, windowMs } = { ...DEFAULT_CONFIG, ...config };
  const store = new Map<string, RateLimitEntry>();

  function prune(now: number) {
    const cutoff = now - windowMs;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }

  /**
   * Check whether a request from the given key (typically an IP) is
   * allowed, and record the attempt.
   */
  function check(key: string, now: number = Date.now()): RateLimitResult {
    prune(now);

    const cutoff = now - windowMs;
    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Filter to only timestamps within the current window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= maxAttempts) {
      // Rate limited — calculate when the oldest request in the window expires
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    // Allowed — record this attempt
    entry.timestamps.push(now);

    return {
      allowed: true,
      remaining: maxAttempts - entry.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /** Reset the store (useful for testing). */
  function reset() {
    store.clear();
  }

  return { check, reset };
}

/**
 * Determines whether a request path should be rate-limited.
 * Matches auth page routes and auth API routes.
 */
export function isAuthRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/")
  );
}
