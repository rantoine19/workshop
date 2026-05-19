import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Search API: handler shape ───────────────────────────────────────────

describe("Search API (#148) — module exports", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/search/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

// ── Search API: auth and validation ─────────────────────────────────────

describe("Search API (#148) — auth & validation", () => {
  type SupabaseStub = {
    auth: { getUser: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
  };
  let mockSupabase: SupabaseStub;

  function setupSupabase(opts: {
    user: { id: string } | null;
    reports?: Array<{
      id: string;
      original_filename: string;
      report_date: string | null;
      created_at: string;
      parsed_results: Array<{
        id: string;
        biomarkers: Array<{
          name: string;
          value: number;
          unit: string;
          reference_low: number | null;
          reference_high: number | null;
          flag: string;
        }>;
      }>;
    }>;
  }) {
    const reports = opts.reports ?? [];
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: opts.user },
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "reports") {
          const builder = {
            select: vi.fn().mockReturnThis(),
            order: vi
              .fn()
              .mockResolvedValue({ data: reports, error: null }),
          };
          return builder;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue(mockSupabase),
    }));
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when there is no authenticated user", async () => {
    setupSupabase({ user: null });
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=cholesterol")
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for empty query", async () => {
    setupSupabase({ user: { id: "user-1" } });
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(new Request("http://localhost/api/search"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when query is shorter than 2 characters", async () => {
    setupSupabase({ user: { id: "user-1" } });
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(new Request("http://localhost/api/search?q=a"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/2 characters/i);
  });

  it("returns 200 with empty results when no matches", async () => {
    setupSupabase({
      user: { id: "user-1" },
      reports: [],
    });
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=cholesterol")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe("cholesterol");
    expect(body.totalResults).toBe(0);
    expect(body.biomarkers).toEqual([]);
    expect(body.reports).toEqual([]);
  });
});

// ── Search API: biomarker matching & grouping ───────────────────────────

describe("Search API (#148) — biomarker matching", () => {
  type SupabaseStub = {
    auth: { getUser: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
  };

  function setupSupabase(reports: Array<Record<string, unknown>>) {
    const mockSupabase: SupabaseStub = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: reports, error: null }),
      })),
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue(mockSupabase),
    }));
  }

  const sampleReports = [
    {
      id: "report-1",
      original_filename: "labcorp-2026-01.pdf",
      report_date: "2026-01-15",
      created_at: "2026-01-20T10:00:00Z",
      parsed_results: [
        {
          id: "pr-1",
          biomarkers: [
            {
              name: "LDL Cholesterol",
              value: 142,
              unit: "mg/dL",
              reference_low: null,
              reference_high: 100,
              flag: "red",
            },
            {
              name: "HDL Cholesterol",
              value: 55,
              unit: "mg/dL",
              reference_low: 40,
              reference_high: 60,
              flag: "green",
            },
            {
              name: "Glucose",
              value: 98,
              unit: "mg/dL",
              reference_low: 70,
              reference_high: 100,
              flag: "green",
            },
          ],
        },
      ],
    },
    {
      id: "report-2",
      original_filename: "quest-march.pdf",
      report_date: "2026-03-10",
      created_at: "2026-03-15T10:00:00Z",
      parsed_results: [
        {
          id: "pr-2",
          biomarkers: [
            {
              name: "ldl-c",
              value: 118,
              unit: "mg/dL",
              reference_low: null,
              reference_high: 100,
              flag: "yellow",
            },
            {
              name: "Fasting Glucose",
              value: 95,
              unit: "mg/dL",
              reference_low: 70,
              reference_high: 100,
              flag: "green",
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("matches LDL synonym 'ldl' to LDL Cholesterol canonical name", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=ldl")
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    const ldl = body.biomarkers.find(
      (b: { canonicalName: string }) => b.canonicalName === "LDL Cholesterol"
    );
    expect(ldl).toBeDefined();
    expect(ldl.readingCount).toBe(2);
  });

  it("is case-insensitive (LDL == ldl == Ldl)", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const responses = await Promise.all([
      GET(new Request("http://localhost/api/search?q=LDL")),
      GET(new Request("http://localhost/api/search?q=ldl")),
      GET(new Request("http://localhost/api/search?q=Ldl")),
    ]);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    const counts = bodies.map((b) => b.biomarkers.length);
    expect(counts[0]).toBe(counts[1]);
    expect(counts[1]).toBe(counts[2]);
    expect(counts[0]).toBeGreaterThan(0);
  });

  it("groups readings by canonical name across multiple reports", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=ldl")
    );
    const body = await res.json();
    const ldl = body.biomarkers.find(
      (b: { canonicalName: string }) => b.canonicalName === "LDL Cholesterol"
    );
    expect(ldl).toBeDefined();
    // Both reports contribute readings
    const reportIds = new Set(
      ldl.readings.map((r: { reportId: string }) => r.reportId)
    );
    expect(reportIds.size).toBe(2);
    expect(reportIds.has("report-1")).toBe(true);
    expect(reportIds.has("report-2")).toBe(true);
  });

  it("sorts readings by date descending (newest first)", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=ldl")
    );
    const body = await res.json();
    const ldl = body.biomarkers.find(
      (b: { canonicalName: string }) => b.canonicalName === "LDL Cholesterol"
    );
    expect(ldl.readings.length).toBe(2);
    // March (newer) should come before January
    expect(ldl.readings[0].reportId).toBe("report-2");
    expect(ldl.readings[1].reportId).toBe("report-1");
  });

  it("includes a trend on each biomarker group", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=ldl")
    );
    const body = await res.json();
    const ldl = body.biomarkers.find(
      (b: { canonicalName: string }) => b.canonicalName === "LDL Cholesterol"
    );
    // LDL dropped 142 -> 118 (lower-is-better) = improving
    expect(["improving", "worsening", "stable"]).toContain(ldl.trend);
    expect(ldl.trend).toBe("improving");
  });

  it("returns biomarker reading shape with required fields", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=ldl")
    );
    const body = await res.json();
    const ldl = body.biomarkers.find(
      (b: { canonicalName: string }) => b.canonicalName === "LDL Cholesterol"
    );
    const reading = ldl.readings[0];
    expect(reading).toHaveProperty("reportId");
    expect(reading).toHaveProperty("reportName");
    expect(reading).toHaveProperty("date");
    expect(reading).toHaveProperty("value");
    expect(reading).toHaveProperty("unit");
    expect(reading).toHaveProperty("flag");
  });

  it("returns biomarker group shape with category and readingCount", async () => {
    setupSupabase(sampleReports);
    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=glucose")
    );
    const body = await res.json();
    expect(body.biomarkers.length).toBeGreaterThan(0);
    const g = body.biomarkers[0];
    expect(g).toHaveProperty("canonicalName");
    expect(g).toHaveProperty("category");
    expect(g).toHaveProperty("readingCount");
    expect(g).toHaveProperty("trend");
    expect(g).toHaveProperty("readings");
    expect(Array.isArray(g.readings)).toBe(true);
    expect(g.readingCount).toBe(g.readings.length);
  });
});

// ── Search API: report filename matching ────────────────────────────────

describe("Search API (#148) — report filename matching", () => {
  function setupSupabase(reports: Array<Record<string, unknown>>) {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: reports, error: null }),
      })),
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue(mockSupabase),
    }));
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("matches report by filename substring", async () => {
    setupSupabase([
      {
        id: "report-x",
        original_filename: "annual-physical-2026.pdf",
        report_date: "2026-02-01",
        created_at: "2026-02-02T10:00:00Z",
        parsed_results: [
          {
            id: "pr-x",
            biomarkers: [
              {
                name: "Sodium",
                value: 140,
                unit: "mEq/L",
                reference_low: 135,
                reference_high: 145,
                flag: "green",
              },
            ],
          },
        ],
      },
    ]);

    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=annual")
    );
    const body = await res.json();
    expect(body.reports.length).toBe(1);
    expect(body.reports[0].name).toBe("annual-physical-2026.pdf");
    expect(body.reports[0].biomarkerCount).toBe(1);
  });

  it("filename match is case-insensitive", async () => {
    setupSupabase([
      {
        id: "report-y",
        original_filename: "BLOODWORK-Jan.pdf",
        report_date: null,
        created_at: "2026-01-05T10:00:00Z",
        parsed_results: [],
      },
    ]);

    const { GET } = await import("@/app/api/search/route");
    const res = await GET(
      new Request("http://localhost/api/search?q=bloodwork")
    );
    const body = await res.json();
    expect(body.reports.length).toBe(1);
    expect(body.reports[0].id).toBe("report-y");
  });
});

// ── SearchBar component ─────────────────────────────────────────────────

describe("SearchBar component (#148)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("exports a default component", async () => {
    const mod = await import("@/components/ui/SearchBar");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("renders an input with the configured placeholder", async () => {
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn() }),
    }));
    const { render, screen } = await import("@testing-library/react");
    const React = (await import("react")).default;
    const { default: SearchBar } = await import("@/components/ui/SearchBar");

    render(
      React.createElement(SearchBar, {
        placeholder: "Search reports, biomarkers...",
      })
    );

    const input = screen.getByPlaceholderText(
      "Search reports, biomarkers..."
    ) as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.tagName).toBe("INPUT");
  });

  it("invokes onSubmit prop when form is submitted with query >= 2 chars", async () => {
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn() }),
    }));
    const { render, screen, fireEvent } = await import(
      "@testing-library/react"
    );
    const React = (await import("react")).default;
    const { default: SearchBar } = await import("@/components/ui/SearchBar");

    const onSubmit = vi.fn();
    render(
      React.createElement(SearchBar, {
        onSubmit,
      })
    );

    const input = screen.getByLabelText("Search query") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ldl" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith("ldl");
  });

  it("renders a clear button only when there is text", async () => {
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn() }),
    }));
    const { render, screen, fireEvent } = await import(
      "@testing-library/react"
    );
    const React = (await import("react")).default;
    const { default: SearchBar } = await import("@/components/ui/SearchBar");

    render(React.createElement(SearchBar, {}));

    expect(screen.queryByLabelText("Clear search")).toBeNull();

    const input = screen.getByLabelText("Search query") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ldl" } });

    expect(screen.getByLabelText("Clear search")).toBeDefined();
  });
});

// ── Search page module ──────────────────────────────────────────────────

describe("Search page (#148) — module exports", () => {
  it("exports a default component", async () => {
    vi.doMock("next/navigation", () => ({
      useSearchParams: () => new URLSearchParams(),
      useRouter: () => ({ push: vi.fn() }),
      usePathname: () => "/search",
    }));
    const mod = await import("@/app/search/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("layout exports force-dynamic and default", async () => {
    const mod = await import("@/app/search/layout");
    expect(mod.dynamic).toBe("force-dynamic");
    expect(mod.default).toBeDefined();
  });
});
