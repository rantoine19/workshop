import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Insurance Cards API Route — GET/POST ──────────────────────────

describe("Insurance Cards API Route", () => {
  it("exports GET and POST handlers", async () => {
    const mod = await import("@/app/api/insurance-cards/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("Insurance Cards API — GET", () => {
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

    const { GET } = await import("@/app/api/insurance-cards/route");
    const response = await GET(
      new Request("http://localhost:3000/api/insurance-cards")
    );

    expect(response.status).toBe(401);
  });

  it("returns 200 with insurance cards for authenticated user (self scope)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockCards = [
      {
        id: "ic-1",
        provider_name: "Blue Cross",
        is_primary: true,
      },
    ];

    const isMock = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockCards,
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: isMock,
        }),
      }),
    });

    const { GET } = await import("@/app/api/insurance-cards/route");
    const response = await GET(
      new Request("http://localhost:3000/api/insurance-cards")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.insurance_cards).toHaveLength(1);
    expect(body.insurance_cards[0].provider_name).toBe("Blue Cross");
    // Self scope => .is("family_member_id", null) called
    expect(isMock).toHaveBeenCalledWith("family_member_id", null);
  });

  it("filters by family_member_id when query param provided", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const eqFamily = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    // First .eq (user_id) returns chain with .eq (family_member_id)
    const firstEq = vi.fn().mockReturnValue({
      eq: eqFamily,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: firstEq,
      }),
    });

    const { GET } = await import("@/app/api/insurance-cards/route");
    const response = await GET(
      new Request(
        "http://localhost:3000/api/insurance-cards?family_member_id=fm-1"
      )
    );

    expect(response.status).toBe(200);
    expect(eqFamily).toHaveBeenCalledWith("family_member_id", "fm-1");
  });
});

describe("Insurance Cards API — POST", () => {
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

    const { POST } = await import("@/app/api/insurance-cards/route");
    const request = new Request("http://localhost:3000/api/insurance-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_name: "Test" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 when provider_name is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/insurance-cards/route");
    const request = new Request("http://localhost:3000/api/insurance-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: "ABC123" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Provider name");
  });

  it("returns 201 on successful creation", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockCard = {
      id: "ic-1",
      provider_name: "Blue Cross Blue Shield",
      member_id: "ABC123",
      is_primary: true,
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCard,
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/insurance-cards/route");
    const request = new Request("http://localhost:3000/api/insurance-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_name: "Blue Cross Blue Shield",
        member_id: "ABC123",
        is_primary: true,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.insurance_card.provider_name).toBe("Blue Cross Blue Shield");
  });

  it("rejects invalid family_member_id not belonging to user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // Family member lookup returns null (not owned)
    mockFrom.mockImplementation((table: string) => {
      if (table === "family_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const { POST } = await import("@/app/api/insurance-cards/route");
    const request = new Request("http://localhost:3000/api/insurance-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_name: "Aetna",
        family_member_id: "fm-other",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("family member");
  });
});

// ── Single Insurance Card API — GET/PUT/DELETE ─────────────────

describe("Single Insurance Card API Route", () => {
  it("exports GET, PUT, and DELETE handlers", async () => {
    const mod = await import("@/app/api/insurance-cards/[id]/route");
    expect(mod.GET).toBeDefined();
    expect(mod.PUT).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

describe("Single Insurance Card API — DELETE", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockStorage: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockStorage = { from: vi.fn() };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
        storage: mockStorage,
      }),
    }));
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { DELETE } = await import("@/app/api/insurance-cards/[id]/route");
    const request = new Request(
      "http://localhost:3000/api/insurance-cards/ic-1",
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "ic-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when card does not exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { DELETE } = await import("@/app/api/insurance-cards/[id]/route");
    const request = new Request(
      "http://localhost:3000/api/insurance-cards/ic-999",
      { method: "DELETE" }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "ic-999" }),
    });

    expect(response.status).toBe(404);
  });
});

// ── Insurance Card Photo API ───────────────────────────────────

describe("Insurance Card Photo API Route", () => {
  it("exports POST and DELETE handlers", async () => {
    const mod = await import("@/app/api/insurance-cards/[id]/photo/route");
    expect(mod.POST).toBeDefined();
    expect(mod.DELETE).toBeDefined();
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("Insurance Card Photo API — POST", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockStorage: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockStorage = { from: vi.fn() };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
        storage: mockStorage,
      }),
    }));
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/insurance-cards/[id]/photo/route");
    const formData = new FormData();
    formData.append(
      "file",
      new File([new ArrayBuffer(1024)], "photo.png", { type: "image/png" })
    );
    formData.append("side", "front");
    const request = new Request(
      "http://localhost:3000/api/insurance-cards/ic-1/photo",
      { method: "POST", body: formData }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "ic-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when card does not belong to user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/insurance-cards/[id]/photo/route");
    const formData = new FormData();
    formData.append(
      "file",
      new File([new ArrayBuffer(1024)], "photo.png", { type: "image/png" })
    );
    formData.append("side", "front");
    const request = new Request(
      "http://localhost:3000/api/insurance-cards/ic-999/photo",
      { method: "POST", body: formData }
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "ic-999" }),
    });

    expect(response.status).toBe(404);
  });

});

// ── Insurance Card Photo URL API ───────────────────────────────

describe("Insurance Card Photo URL API", () => {
  it("exports GET handler", async () => {
    const mod = await import(
      "@/app/api/insurance-cards/[id]/photo-url/route"
    );
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

// ── Page Components ───────────────────────────────────────────

describe("Insurance Cards Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/insurance/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Add Insurance Card Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/insurance/add/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Edit Insurance Card Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/insurance/[id]/edit/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Insurance Card Show Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/insurance/[id]/show/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Audit Logger — insurance_card actions ─────────────────────

describe("Audit Logger — insurance_card types", () => {
  it("exports logger module cleanly with insurance_card types", async () => {
    const mod = await import("@/lib/audit/logger");
    expect(mod.logAuditEvent).toBeDefined();
    expect(typeof mod.logAuditEvent).toBe("function");
  });
});
