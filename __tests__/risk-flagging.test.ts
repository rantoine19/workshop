import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Risk Calculator ─────────────────────────────────────────────────

describe("Risk Calculator", () => {
  it("exports calculateRiskFlag and calculateRiskFlags", async () => {
    const mod = await import("@/lib/risk/calculator");
    expect(mod.calculateRiskFlag).toBeDefined();
    expect(mod.calculateRiskFlags).toBeDefined();
  });

  describe("calculateRiskFlag", () => {
    let calculateRiskFlag: (
      value: number,
      low: number | null,
      high: number | null
    ) => string;

    beforeEach(async () => {
      const mod = await import("@/lib/risk/calculator");
      calculateRiskFlag = mod.calculateRiskFlag;
    });

    // Green — within range
    it("returns green when value is within reference range", () => {
      expect(calculateRiskFlag(85, 70, 100)).toBe("green");
    });

    it("returns green when value equals low boundary", () => {
      expect(calculateRiskFlag(70, 70, 100)).toBe("green");
    });

    it("returns green when value equals high boundary", () => {
      expect(calculateRiskFlag(100, 70, 100)).toBe("green");
    });

    it("returns green when no reference range is provided", () => {
      expect(calculateRiskFlag(150, null, null)).toBe("green");
    });

    // Yellow — within 10% of boundary
    it("returns yellow when value is slightly below low bound (within 10%)", () => {
      // Low = 70, 10% of 70 = 7, so 63-69 is yellow
      expect(calculateRiskFlag(65, 70, 100)).toBe("yellow");
    });

    it("returns yellow when value is slightly above high bound (within 10%)", () => {
      // High = 100, 10% of 100 = 10, so 101-110 is yellow
      expect(calculateRiskFlag(105, 70, 100)).toBe("yellow");
    });

    it("returns yellow at the exact 10% boundary below low", () => {
      // Low = 70, 10% = 7, boundary = 63
      expect(calculateRiskFlag(63, 70, 100)).toBe("yellow");
    });

    it("returns yellow at the exact 10% boundary above high", () => {
      // High = 100, 10% = 10, boundary = 110
      expect(calculateRiskFlag(110, 70, 100)).toBe("yellow");
    });

    // Red — more than 10% outside range
    it("returns red when value is >10% below low bound", () => {
      // Low = 70, 10% = 7, below 63 is red
      expect(calculateRiskFlag(50, 70, 100)).toBe("red");
    });

    it("returns red when value is >10% above high bound", () => {
      // High = 100, 10% = 10, above 110 is red
      expect(calculateRiskFlag(120, 70, 100)).toBe("red");
    });

    it("returns red just past the 10% boundary below", () => {
      // Low = 70, 10% = 7, boundary = 63, so 62.9 is red
      expect(calculateRiskFlag(62, 70, 100)).toBe("red");
    });

    it("returns red just past the 10% boundary above", () => {
      // High = 100, 10% = 10, boundary = 110, so 111 is red
      expect(calculateRiskFlag(111, 70, 100)).toBe("red");
    });

    // Only one bound
    it("returns green when only low bound and value is above it", () => {
      expect(calculateRiskFlag(80, 70, null)).toBe("green");
    });

    it("returns yellow when only low bound and value is slightly below", () => {
      expect(calculateRiskFlag(65, 70, null)).toBe("yellow");
    });

    it("returns red when only low bound and value is far below", () => {
      expect(calculateRiskFlag(50, 70, null)).toBe("red");
    });

    it("returns green when only high bound and value is below it", () => {
      expect(calculateRiskFlag(80, null, 100)).toBe("green");
    });

    it("returns yellow when only high bound and value is slightly above", () => {
      expect(calculateRiskFlag(105, null, 100)).toBe("yellow");
    });

    it("returns red when only high bound and value is far above", () => {
      expect(calculateRiskFlag(120, null, 100)).toBe("red");
    });
  });

  describe("calculateRiskFlags", () => {
    it("calculates flags for an array of biomarkers", async () => {
      const { calculateRiskFlags } = await import("@/lib/risk/calculator");

      const results = calculateRiskFlags([
        { name: "Glucose", value: 85, reference_low: 70, reference_high: 100 },
        {
          name: "Cholesterol",
          value: 250,
          reference_low: 125,
          reference_high: 200,
        },
        {
          name: "TSH",
          value: 4.2,
          reference_low: 0.4,
          reference_high: 4.0,
        },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].flag).toBe("green"); // 85 in [70, 100]
      expect(results[1].flag).toBe("red"); // 250 far above 200
      expect(results[2].flag).toBe("yellow"); // 4.2 slightly above 4.0
    });

    it("returns correct structure for each result", async () => {
      const { calculateRiskFlags } = await import("@/lib/risk/calculator");

      const results = calculateRiskFlags([
        { name: "Glucose", value: 85, reference_low: 70, reference_high: 100 },
      ]);

      expect(results[0]).toEqual({
        biomarker_name: "Glucose",
        value: 85,
        reference_low: 70,
        reference_high: 100,
        flag: "green",
      });
    });
  });
});

// ── Risk Flags API Route ────────────────────────────────────────────

describe("Risk Flags API Route", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/risk-flags/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

describe("Risk Flags API Contract", () => {
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

    // Mock audit logger to prevent fire-and-forget calls from interfering
    vi.doMock("@/lib/audit/logger", () => ({
      logAuditEvent: vi.fn(),
      getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
    }));
  });

  function buildRequest(reportId?: string): Request {
    const url = reportId
      ? `http://localhost:3000/api/risk-flags?report_id=${reportId}`
      : "http://localhost:3000/api/risk-flags";
    return new Request(url, { method: "GET" });
  }

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/risk-flags/route");
    const response = await GET(buildRequest("report-123"));

    expect(response.status).toBe(401);
  });

  it("returns 400 when report_id is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { GET } = await import("@/app/api/risk-flags/route");
    const response = await GET(buildRequest());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("report_id");
  });

  it("returns 403 when user does not own the report", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "report-123", user_id: "other-user" },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/risk-flags/route");
    const response = await GET(buildRequest("report-123"));

    expect(response.status).toBe(403);
  });

  it("returns 200 with risk flags and summary for valid request", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockFlags = [
      {
        id: "f1",
        biomarker_name: "Glucose",
        value: 85,
        reference_low: 70,
        reference_high: 100,
        flag: "green",
        trend: "stable",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "f2",
        biomarker_name: "Cholesterol",
        value: 250,
        reference_low: 125,
        reference_high: 200,
        flag: "red",
        trend: "worsening",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // reports table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-123", user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // parsed_results table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "pr-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 3) {
        // risk_flags table
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockFlags,
                error: null,
              }),
            }),
          }),
        };
      }
      // biomarker_corrections table (new — #136)
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      };
    });

    const { GET } = await import("@/app/api/risk-flags/route");
    const response = await GET(buildRequest("report-123"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.risk_flags).toHaveLength(2);
    expect(body.summary.green).toBe(1);
    expect(body.summary.red).toBe(1);
    expect(body.summary.total).toBe(2);
    expect(body.disclaimer).toContain("informational purposes only");
    // New: correction info enrichment (#136)
    expect(body.risk_flags[0].corrected).toBe(false);
    expect(body.risk_flags[0].original_value).toBeNull();
  });
});

// ── Risk Components ─────────────────────────────────────────────────

describe("Risk Components", () => {
  it("RiskIndicator exports a default component", async () => {
    const mod = await import("@/components/reports/RiskIndicator");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("RiskDashboard exports a default component", async () => {
    const mod = await import("@/components/reports/RiskDashboard");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});
