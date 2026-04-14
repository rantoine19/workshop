import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Family Members API — GET/POST ──────────────────────────────

describe("Family Members API Route", () => {
  it("exports GET and POST handlers", async () => {
    const mod = await import("@/app/api/family-members/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("Family Members API — GET", () => {
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

    const { GET } = await import("@/app/api/family-members/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns 200 with family members list for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockMembers = [
      { id: "fm-1", display_name: "Mom", relationship: "Parent" },
      { id: "fm-2", display_name: "Dad", relationship: "Parent" },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockMembers,
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/family-members/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members).toHaveLength(2);
    expect(body.members[0].display_name).toBe("Mom");
  });
});

describe("Family Members API — POST", () => {
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

    const { POST } = await import("@/app/api/family-members/route");
    const request = new Request("http://localhost/api/family-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: "Mom" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when display_name is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/family-members/route");
    const request = new Request("http://localhost/api/family-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("display_name");
  });

  it("returns 400 when max 10 family members reached", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // First call: count check (returns 10)
    // Second call: insert (should not be called)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          count: 10,
          error: null,
        }),
      }),
    });

    const { POST } = await import("@/app/api/family-members/route");
    const request = new Request("http://localhost/api/family-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: "Another member" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Maximum");
  });

  it("creates a family member successfully", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const createdMember = {
      id: "fm-new",
      display_name: "Mom",
      relationship: "Parent",
      owner_id: "user-1",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Count check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        };
      }
      // Insert
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdMember,
              error: null,
            }),
          }),
        }),
      };
    });

    const { POST } = await import("@/app/api/family-members/route");
    const request = new Request("http://localhost/api/family-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: "Mom", relationship: "Parent" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.member.display_name).toBe("Mom");
  });
});

// ── Family Members Single API — GET/PUT/DELETE ──────────────────

describe("Family Members [id] API Route", () => {
  it("exports GET, PUT, and DELETE handlers", async () => {
    const mod = await import("@/app/api/family-members/[id]/route");
    expect(mod.GET).toBeDefined();
    expect(mod.PUT).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

describe("Family Members [id] API — DELETE", () => {
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

    const { DELETE } = await import("@/app/api/family-members/[id]/route");
    const request = new Request("http://localhost/api/family-members/fm-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "fm-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("deletes a family member successfully", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const { DELETE } = await import("@/app/api/family-members/[id]/route");
    const request = new Request("http://localhost/api/family-members/fm-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "fm-1" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});

// ── Reports API — family_member_id filtering ────────────────────

describe("Reports API — family_member_id filtering", () => {
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

  it("passes family_member_id to the query when provided", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const eqFn = vi.fn().mockResolvedValue({ data: [], error: null });
    const limitFn = vi.fn().mockReturnValue({ eq: eqFn, is: eqFn });
    const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
    const selectFn = vi.fn().mockReturnValue({ order: orderFn });

    mockFrom.mockReturnValue({ select: selectFn });

    const { GET } = await import("@/app/api/reports/route");
    const request = new Request(
      "http://localhost/api/reports?family_member_id=fm-1"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});

// ── useActiveProfile hook ───────────────────────────────────────

describe("useActiveProfile hook", () => {
  it("exports useActiveProfile function", async () => {
    const mod = await import("@/hooks/useActiveProfile");
    expect(mod.useActiveProfile).toBeDefined();
    expect(typeof mod.useActiveProfile).toBe("function");
  });
});

// ── ProfileSwitcher component ───────────────────────────────────

describe("ProfileSwitcher component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/components/ui/ProfileSwitcher");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Family pages ────────────────────────────────────────────────

describe("Family page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/family/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Add Family Member page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/family/add/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Database migration ──────────────────────────────────────────

describe("Family Members Migration", () => {
  it("migration file contains expected table and column definitions", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/016_family_members.sql"
    );
    const content = fs.readFileSync(migrationPath, "utf8");

    expect(content).toContain("CREATE TABLE family_members");
    expect(content).toContain("owner_id uuid NOT NULL");
    expect(content).toContain("display_name text NOT NULL");
    expect(content).toContain("ENABLE ROW LEVEL SECURITY");
    expect(content).toContain("family_member_id uuid");
    expect(content).toContain("ALTER TABLE reports");
  });
});
