import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Onboarding Page Component ──────────────────────────────────────

describe("Onboarding Page Component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/onboarding/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Onboarding Layout ──────────────────────────────────────────────

describe("Onboarding Layout", () => {
  it("exports a default layout component", async () => {
    const mod = await import("@/app/onboarding/layout");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("has force-dynamic export", async () => {
    const mod = await import("@/app/onboarding/layout");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});

// ── Dashboard Onboarding Redirect ──────────────────────────────────

describe("Dashboard — onboarding redirect", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockRedirect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockRedirect = vi.fn().mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      }),
    }));

    vi.doMock("next/navigation", () => ({
      redirect: mockRedirect,
    }));

    vi.doMock("next/link", () => ({
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => children,
    }));
  });

  it("redirects to /onboarding when display_name is null", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { display_name: null },
            error: null,
          }),
        }),
      }),
    });

    const { default: DashboardPage } = await import(
      "@/app/dashboard/page"
    );

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
  });

  it("does not redirect when display_name is set", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@test.com" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { display_name: "Test User" },
            error: null,
          }),
        }),
      }),
    });

    const { default: DashboardPage } = await import(
      "@/app/dashboard/page"
    );

    // Should not throw (no redirect to onboarding)
    const result = await DashboardPage();
    expect(result).toBeDefined();
  });
});

// ── Profile API — height_inches ────────────────────────────────────

describe("Profile API — height_inches validation", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      }),
    }));
  });

  function buildRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 for height_inches over 108", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ height_inches: 200 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("height_inches");
  });

  it("returns 400 for negative height_inches", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ height_inches: -5 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("height_inches");
  });

  it("returns 400 for non-integer height_inches", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ height_inches: 65.5 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("height_inches");
  });

  it("accepts valid height_inches", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: null,
              date_of_birth: null,
              gender: null,
              avatar_url: null,
              height_inches: 68,
              updated_at: "2026-04-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ height_inches: 68 }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.height_inches).toBe(68);
  });

  it("accepts null height_inches to clear the value", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: null,
              date_of_birth: null,
              gender: null,
              avatar_url: null,
              height_inches: null,
              updated_at: "2026-04-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ height_inches: null }));

    expect(response.status).toBe(200);
  });
});

// ── Migration file ─────────────────────────────────────────────────

describe("Profile height migration", () => {
  it("migration file exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/010_profile_height.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
  });
});
