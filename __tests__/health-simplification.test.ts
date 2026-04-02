import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Simplification Prompts ──────────────────────────────────────────

describe("Simplification Prompts", () => {
  it("exports system prompt, user prompt, and formatter", async () => {
    const mod = await import("@/lib/claude/simplification-prompts");
    expect(mod.SIMPLIFICATION_SYSTEM_PROMPT).toBeDefined();
    expect(mod.SIMPLIFICATION_USER_PROMPT).toBeDefined();
    expect(mod.formatBiomarkersForSimplification).toBeDefined();
  });

  it("system prompt requires 5th grade reading level", async () => {
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain("5th grade");
  });

  it("system prompt prohibits diagnoses", async () => {
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain("NEVER diagnose");
  });

  it("system prompt requires JSON response format", async () => {
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain('"overall"');
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain('"biomarkers"');
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain('"explanation"');
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain('"importance"');
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain('"action"');
  });

  it("system prompt requires disclaimer in response", async () => {
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain('"disclaimer"');
  });

  it("formatBiomarkersForSimplification formats biomarkers correctly", async () => {
    const { formatBiomarkersForSimplification } = await import(
      "@/lib/claude/simplification-prompts"
    );

    const biomarkers = [
      {
        name: "Glucose",
        value: 95,
        unit: "mg/dL",
        reference_low: 70,
        reference_high: 100,
        flag: "green",
      },
      {
        name: "Cholesterol",
        value: 250,
        unit: "mg/dL",
        reference_low: null,
        reference_high: null,
        flag: "red",
      },
    ];

    const result = formatBiomarkersForSimplification(biomarkers);

    expect(result).toContain("Glucose: 95 mg/dL");
    expect(result).toContain("Normal range: 70-100 mg/dL");
    expect(result).toContain("Flag: green");
    expect(result).toContain("Cholesterol: 250 mg/dL");
    expect(result).toContain("Normal range: not available");
    expect(result).toContain("Flag: red");
  });
});

// ── Summary API Route ───────────────────────────────────────────────

describe("Summary API Route", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/reports/[id]/summary/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

// ── Summary API Contract Tests ──────────────────────────────────────

describe("Summary API Contract", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockMessagesCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockMessagesCreate = vi.fn();

    // Mock Supabase server client
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      }),
    }));

    // Mock Claude client
    vi.doMock("@/lib/claude/client", () => ({
      getClaudeClient: vi.fn().mockReturnValue({
        messages: { create: mockMessagesCreate },
      }),
    }));
  });

  function buildRequest(): Request {
    return new Request("http://localhost:3000/api/reports/report-123/summary", {
      method: "GET",
    });
  }

  function buildParams(): Promise<{ id: string }> {
    return Promise.resolve({ id: "report-123" });
  }

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/reports/[id]/summary/route");
    const response = await GET(buildRequest(), { params: buildParams() });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when report is not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/reports/[id]/summary/route");
    const response = await GET(buildRequest(), { params: buildParams() });

    expect(response.status).toBe(404);
  });

  it("returns 403 when user does not own the report", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // First call: reports table — returns report owned by different user
    // Second call: parsed_results — should not be reached
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-123", user_id: "other-user", status: "parsed" },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/reports/[id]/summary/route");
    const response = await GET(buildRequest(), { params: buildParams() });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns cached summary when available", async () => {
    const cachedSummary = {
      overall: "Your results look good.",
      biomarkers: [
        {
          name: "Glucose",
          value: "95 mg/dL",
          flag: "green",
          explanation: "This measures sugar in your blood.",
          importance: "It tells us about diabetes risk.",
          action: "Keep eating healthy.",
        },
      ],
      disclaimer: "Talk to your doctor.",
    };

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // reports table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-123", user_id: "user-1", status: "parsed" },
                error: null,
              }),
            }),
          }),
        };
      }
      // parsed_results table — has cached summary
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "pr-1",
                biomarkers: [],
                summary_plain: JSON.stringify(cachedSummary),
              },
              error: null,
            }),
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/reports/[id]/summary/route");
    const response = await GET(buildRequest(), { params: buildParams() });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cached).toBe(true);
    expect(body.summary.overall).toBe("Your results look good.");
    expect(body.summary.biomarkers).toHaveLength(1);
    // Claude should NOT have been called
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("calls Claude and returns simplified summary when no cache", async () => {
    const simplifiedResponse = {
      overall: "Your lab results look mostly normal.",
      biomarkers: [
        {
          name: "Glucose",
          value: "95 mg/dL",
          flag: "green",
          explanation: "This measures sugar in your blood.",
          importance: "It helps check for diabetes.",
          action: "Keep eating well and exercising.",
        },
      ],
      disclaimer: "These explanations are for educational purposes only.",
    };

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // reports table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-123", user_id: "user-1", status: "parsed" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // parsed_results table — no cached summary
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "pr-1",
                  biomarkers: [
                    {
                      name: "Glucose",
                      value: 95,
                      unit: "mg/dL",
                      reference_low: 70,
                      reference_high: 100,
                      flag: "green",
                    },
                  ],
                  summary_plain: "Basic extraction summary",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      // Update call for caching
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify(simplifiedResponse),
        },
      ],
    });

    const { GET } = await import("@/app/api/reports/[id]/summary/route");
    const response = await GET(buildRequest(), { params: buildParams() });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cached).toBe(false);
    expect(body.summary.overall).toBe("Your lab results look mostly normal.");
    expect(body.summary.biomarkers).toHaveLength(1);
    expect(body.summary.biomarkers[0].explanation).toContain("sugar");
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });
});

// ── HealthSummary Component ─────────────────────────────────────────

describe("HealthSummary Component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/components/reports/HealthSummary");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});
