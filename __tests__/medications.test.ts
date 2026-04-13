import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Medications API Route — GET/POST ──────────────────────────────

describe("Medications API Route", () => {
  it("exports GET and POST handlers", async () => {
    const mod = await import("@/app/api/medications/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("Medications API — GET", () => {
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

    const { GET } = await import("@/app/api/medications/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns 200 with medications list for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockMedications = [
      { id: "med-1", name: "Metformin", active: true },
      { id: "med-2", name: "Lisinopril", active: false },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockMedications,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/medications/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.medications).toHaveLength(2);
    expect(body.medications[0].name).toBe("Metformin");
  });
});

describe("Medications API — POST", () => {
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

    const { POST } = await import("@/app/api/medications/route");
    const request = new Request("http://localhost:3000/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 when medication name is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/medications/route");
    const request = new Request("http://localhost:3000/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dosage: "500" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("name");
  });

  it("returns 201 on successful creation", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockMedication = {
      id: "med-1",
      name: "Metformin",
      dosage: "500",
      dosage_unit: "mg",
      frequency: "twice_daily",
      active: true,
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockMedication,
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/medications/route");
    const request = new Request("http://localhost:3000/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Metformin",
        dosage: "500",
        dosage_unit: "mg",
        frequency: "twice_daily",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.medication.name).toBe("Metformin");
  });
});

// ── Single Medication API — GET/PUT/DELETE ─────────────────────────

describe("Single Medication API Route", () => {
  it("exports GET, PUT, and DELETE handlers", async () => {
    const mod = await import("@/app/api/medications/[id]/route");
    expect(mod.GET).toBeDefined();
    expect(mod.PUT).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

describe("Single Medication API — DELETE", () => {
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

    const { DELETE } = await import("@/app/api/medications/[id]/route");
    const request = new Request("http://localhost:3000/api/medications/med-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "med-1" }),
    });

    expect(response.status).toBe(401);
  });
});

// ── Medication Photo API ──────────────────────────────────────────

describe("Medication Photo API Route", () => {
  it("exports POST and DELETE handlers", async () => {
    const mod = await import("@/app/api/medications/[id]/photo/route");
    expect(mod.POST).toBeDefined();
    expect(mod.DELETE).toBeDefined();
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("Medication Photo API — POST", () => {
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

    const { POST } = await import("@/app/api/medications/[id]/photo/route");
    const formData = new FormData();
    formData.append("file", new File([new ArrayBuffer(1024)], "photo.png", { type: "image/png" }));
    const request = new Request("http://localhost:3000/api/medications/med-1/photo", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "med-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when medication does not belong to user", async () => {
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

    const { POST } = await import("@/app/api/medications/[id]/photo/route");
    const formData = new FormData();
    formData.append("file", new File([new ArrayBuffer(1024)], "photo.png", { type: "image/png" }));
    const request = new Request("http://localhost:3000/api/medications/med-999/photo", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "med-999" }),
    });

    expect(response.status).toBe(404);
  });
});

// ── Medications Page Component ────────────────────────────────────

describe("Medications Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/medications/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Add Medication Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/medications/add/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Edit Medication Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/medications/[id]/edit/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Chat Context — Structured Medications ─────────────────────────

describe("buildHealthContext with structured medications", () => {
  it("includes structured medications when provided", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const profile = {
      gender: "male",
      medications: "old free text",
    };

    const structuredMeds = [
      { name: "Metformin", dosage: "500", dosage_unit: "mg", frequency: "twice_daily" },
      { name: "Lisinopril", dosage: "10", dosage_unit: "mg", frequency: "once_daily" },
    ];

    const result = buildHealthContext(profile, structuredMeds);

    expect(result).toContain("Active medications:");
    expect(result).toContain("Metformin 500mg");
    expect(result).toContain("Lisinopril 10mg");
    // Should NOT contain free-text when structured is available
    expect(result).not.toContain("old free text");
  });

  it("falls back to free-text when no structured medications", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const profile = {
      medications: "Aspirin, Vitamin D",
    };

    const result = buildHealthContext(profile, []);

    expect(result).toContain("Medications: Aspirin, Vitamin D");
    expect(result).not.toContain("Active medications:");
  });

  it("falls back to free-text when structuredMedications is undefined", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const profile = {
      medications: "Aspirin",
    };

    const result = buildHealthContext(profile);

    expect(result).toContain("Medications: Aspirin");
  });
});

describe("formatMedicationForContext", () => {
  it("formats medication with name, dosage, unit, and frequency", async () => {
    const { formatMedicationForContext } = await import("@/lib/claude/chat-prompts");

    const result = formatMedicationForContext({
      name: "Metformin",
      dosage: "500",
      dosage_unit: "mg",
      frequency: "twice_daily",
    });

    expect(result).toBe("Metformin 500mg (twice daily)");
  });

  it("formats medication with name only", async () => {
    const { formatMedicationForContext } = await import("@/lib/claude/chat-prompts");

    const result = formatMedicationForContext({
      name: "Vitamin D",
      frequency: "once_daily",
    });

    expect(result).toBe("Vitamin D (daily)");
  });

  it("handles dosage without unit", async () => {
    const { formatMedicationForContext } = await import("@/lib/claude/chat-prompts");

    const result = formatMedicationForContext({
      name: "Aspirin",
      dosage: "81",
      frequency: "once_daily",
    });

    expect(result).toBe("Aspirin 81 (daily)");
  });
});

// ── Audit Logger — medication actions ─────────────────────────────

describe("Audit Logger — medication types", () => {
  it("includes medication audit action types", async () => {
    // The AuditAction type includes medication actions — verify the module loads cleanly
    const mod = await import("@/lib/audit/logger");
    expect(mod.logAuditEvent).toBeDefined();
    expect(typeof mod.logAuditEvent).toBe("function");
  });
});
