import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter, isAuthRoute } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  const maxAttempts = 5;
  const windowMs = 60_000;
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter({ maxAttempts, windowMs });
  });

  it("allows requests under the limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < maxAttempts; i++) {
      const result = limiter.check("192.168.1.1", now + i);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(maxAttempts - (i + 1));
    }
  });

  it("returns 429 after exceeding the rate limit", () => {
    const now = 1_000_000;
    // Exhaust all attempts
    for (let i = 0; i < maxAttempts; i++) {
      limiter.check("192.168.1.1", now);
    }

    // Next request should be denied
    const result = limiter.check("192.168.1.1", now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("includes Retry-After seconds on rate-limited responses", () => {
    const now = 1_000_000;
    // Exhaust all attempts
    for (let i = 0; i < maxAttempts; i++) {
      limiter.check("192.168.1.1", now);
    }

    const result = limiter.check("192.168.1.1", now + 1_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    // Should be roughly (windowMs - 1000) / 1000 = 59 seconds
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("allows requests again after the window expires", () => {
    const now = 1_000_000;
    // Exhaust all attempts
    for (let i = 0; i < maxAttempts; i++) {
      limiter.check("192.168.1.1", now);
    }

    // Should be denied
    expect(limiter.check("192.168.1.1", now).allowed).toBe(false);

    // After window expires, should be allowed again
    const result = limiter.check("192.168.1.1", now + windowMs + 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(maxAttempts - 1);
  });

  it("tracks different IPs independently", () => {
    const now = 1_000_000;
    // Exhaust attempts for IP A
    for (let i = 0; i < maxAttempts; i++) {
      limiter.check("10.0.0.1", now);
    }
    expect(limiter.check("10.0.0.1", now).allowed).toBe(false);

    // IP B should still be allowed
    const result = limiter.check("10.0.0.2", now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(maxAttempts - 1);
  });

  it("uses sliding window — old requests expire individually", () => {
    const now = 1_000_000;
    // Make requests spread across the window
    for (let i = 0; i < maxAttempts; i++) {
      limiter.check("192.168.1.1", now + i * 10_000); // every 10s
    }

    // At now + 40_000, all 5 are still within window — should be denied
    const denied = limiter.check("192.168.1.1", now + 40_000);
    expect(denied.allowed).toBe(false);

    // At now + 60_001, the first request (at now+0) has expired — should be allowed
    const allowed = limiter.check("192.168.1.1", now + 60_001);
    expect(allowed.allowed).toBe(true);
  });

  it("reset clears all tracked data", () => {
    const now = 1_000_000;
    for (let i = 0; i < maxAttempts; i++) {
      limiter.check("192.168.1.1", now);
    }
    expect(limiter.check("192.168.1.1", now).allowed).toBe(false);

    limiter.reset();

    const result = limiter.check("192.168.1.1", now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(maxAttempts - 1);
  });
});

describe("isAuthRoute", () => {
  it("matches /auth/* page routes", () => {
    expect(isAuthRoute("/auth/login")).toBe(true);
    expect(isAuthRoute("/auth/signup")).toBe(true);
    expect(isAuthRoute("/auth/reset-password")).toBe(true);
  });

  it("matches /api/auth/* API routes", () => {
    expect(isAuthRoute("/api/auth/callback")).toBe(true);
    expect(isAuthRoute("/api/auth/confirm")).toBe(true);
  });

  it("does not match non-auth routes", () => {
    expect(isAuthRoute("/dashboard")).toBe(false);
    expect(isAuthRoute("/api/health")).toBe(false);
    expect(isAuthRoute("/api/chat")).toBe(false);
    expect(isAuthRoute("/")).toBe(false);
  });
});
