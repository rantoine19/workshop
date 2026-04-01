import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Profile API Route ───────────────────────────────────────────────

describe("Profile API Route", () => {
  it("exports GET and PUT handlers", async () => {
    const mod = await import("@/app/api/profile/route");
    expect(mod.GET).toBeDefined();
    expect(mod.PUT).toBeDefined();
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.PUT).toBe("function");
  });
});

// ── Profile API Contract ────────────────────────────────────────────

describe("Profile API — GET", () => {
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

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns 200 with profile data for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: "Test User",
              date_of_birth: "1990-01-15",
              gender: "male",
              updated_at: "2026-01-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.display_name).toBe("Test User");
    expect(body.profile.date_of_birth).toBe("1990-01-15");
    expect(body.profile.gender).toBe("male");
  });

  it("returns default profile for new user with no profile row", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "no rows" },
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.id).toBe("user-1");
    expect(body.profile.display_name).toBeNull();
    expect(body.profile.date_of_birth).toBeNull();
  });
});

describe("Profile API — PUT", () => {
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

  function buildRequest(body?: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "invalid",
    });
  }

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ display_name: "Test" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      new Request("http://localhost:3000/api/profile", {
        method: "PUT",
        body: "not json",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for display_name over 100 characters", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({ display_name: "a".repeat(101) })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("display_name");
  });

  it("returns 400 for invalid date_of_birth format", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({ date_of_birth: "January 1, 1990" })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("YYYY-MM-DD");
  });

  it("returns 400 for future date_of_birth", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({ date_of_birth: "2099-01-01" })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("past");
  });

  it("returns 400 for invalid gender value", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ gender: "invalid" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("gender");
  });

  it("returns 200 with updated profile on valid PUT", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: "New Name",
              date_of_birth: "1990-06-15",
              gender: "female",
              updated_at: "2026-04-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({
        display_name: "New Name",
        date_of_birth: "1990-06-15",
        gender: "female",
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.display_name).toBe("New Name");
    expect(body.profile.date_of_birth).toBe("1990-06-15");
    expect(body.profile.gender).toBe("female");
  });
});

// ── Profile Page Component ──────────────────────────────────────────

describe("Profile Page Component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/profile/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});
