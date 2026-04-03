import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ── Reports List API Route ───────────────────────────────────────────

describe("Reports List API Route", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/reports/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

// ── Single Report API Route ──────────────────────────────────────────

describe("Single Report API Route", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/reports/[id]/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

// ── Report Results Page ──────────────────────────────────────────────

describe("Report Results Page", () => {
  const mockFetch = vi.fn();

  // Profile API response for NavHeader avatar fetch
  const profileResponse = {
    ok: true,
    json: async () => ({
      profile: {
        id: "user-1",
        display_name: null,
        avatar_url: null,
        updated_at: null,
      },
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Wrap mockFetch to auto-handle NavHeader's /api/profile calls
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (input: string | URL | Request, ...args: unknown[]) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url === "/api/profile") {
          return Promise.resolve(profileResponse as Response);
        }
        return mockFetch(input, ...args);
      }
    );

    vi.doMock("next/navigation", () => ({
      useParams: () => ({ id: "report-abc" }),
      usePathname: () => "/reports/report-abc",
    }));
  });

  it("shows loading state initially", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    expect(screen.getByText("Loading your report...")).toBeDefined();
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("renders report with health summary and risk dashboard when parsed", async () => {
    // Report API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        report: {
          id: "report-abc",
          file_name: "lab-results.pdf",
          file_type: "pdf",
          status: "parsed",
          created_at: "2026-03-15T10:00:00Z",
          parsed_result_id: "parsed-1",
        },
      }),
    });

    // Health summary fetch (HealthSummary component)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        summary: {
          overall: "Your results look good overall.",
          biomarkers: [
            {
              name: "Glucose",
              value: "95 mg/dL",
              flag: "green",
              explanation: "Blood sugar level",
              importance: "Shows how your body handles sugar",
              action: "Keep up the good work",
            },
          ],
          disclaimer: "This is for informational purposes only.",
        },
        cached: true,
      }),
    });

    // Risk flags fetch (RiskDashboard component)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_flags: [
          {
            id: "rf-1",
            biomarker_name: "Glucose",
            value: 95,
            reference_low: 70,
            reference_high: 100,
            flag: "green",
            trend: "stable",
          },
        ],
        summary: { total: 1, green: 1, yellow: 0, red: 0 },
        disclaimer: "These indicators are for informational purposes only.",
      }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(screen.getByText("lab-results.pdf")).toBeDefined();
    });

    // Status badge
    expect(screen.getByText("Analyzed")).toBeDefined();

    // Navigation links
    expect(screen.getByText("Prepare for Doctor Visit")).toBeDefined();
    expect(screen.getByText("Chat About Results")).toBeDefined();
    // NavHeader provides navigation
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("shows pending state for reports still processing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        report: {
          id: "report-abc",
          file_name: "lab-results.pdf",
          file_type: "pdf",
          status: "parsing",
          created_at: "2026-03-15T10:00:00Z",
          parsed_result_id: null,
        },
      }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(
        screen.getByText("Your report is being analyzed")
      ).toBeDefined();
    });

    expect(screen.getByText("Refresh Status")).toBeDefined();
  });

  it("shows error state for failed reports", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        report: {
          id: "report-abc",
          file_name: "lab-results.pdf",
          file_type: "pdf",
          status: "error",
          created_at: "2026-03-15T10:00:00Z",
          parsed_result_id: null,
        },
      }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeDefined();
    });

    expect(screen.getByText("Upload Again")).toBeDefined();
  });

  it("shows error when report not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Report not found" }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(screen.getByText("Report not found")).toBeDefined();
    });

    expect(screen.getByText("Try Again")).toBeDefined();
  });

  it("shows auth error when unauthorized", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(
        screen.getByText("Please log in to view this report")
      ).toBeDefined();
    });
  });
});

// ── Report Results Layout ────────────────────────────────────────────

describe("Report Results Layout", () => {
  it("exports force-dynamic", async () => {
    const mod = await import("@/app/reports/[id]/layout");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});

// ── Report List Component ────────────────────────────────────────────

describe("ReportList Component", () => {
  const mockFetch = vi.fn();

  // Profile API response for NavHeader avatar fetch
  const profileResponse = {
    ok: true,
    json: async () => ({
      profile: {
        id: "user-1",
        display_name: null,
        avatar_url: null,
        updated_at: null,
      },
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Wrap mockFetch to auto-handle NavHeader's /api/profile calls
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (input: string | URL | Request, ...args: unknown[]) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url === "/api/profile") {
          return Promise.resolve(profileResponse as Response);
        }
        return mockFetch(input, ...args);
      }
    );
  });

  it("renders reports with file names and status badges", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reports: [
          {
            id: "r1",
            file_name: "blood-work.pdf",
            file_type: "pdf",
            status: "parsed",
            created_at: "2026-03-15T10:00:00Z",
          },
          {
            id: "r2",
            file_name: "cbc-results.jpg",
            file_type: "image",
            status: "parsing",
            created_at: "2026-03-14T10:00:00Z",
          },
        ],
      }),
    });

    const { default: ReportList } = await import(
      "@/components/reports/ReportList"
    );
    render(React.createElement(ReportList));

    await waitFor(() => {
      expect(screen.getByText("blood-work.pdf")).toBeDefined();
    });

    expect(screen.getByText("cbc-results.jpg")).toBeDefined();
    expect(screen.getByText("Analyzed")).toBeDefined();
    expect(screen.getByText("Processing")).toBeDefined();
    expect(screen.getByText("Your Reports")).toBeDefined();
  });

  it("shows empty state when no reports exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reports: [] }),
    });

    const { default: ReportList } = await import(
      "@/components/reports/ReportList"
    );
    render(React.createElement(ReportList));

    await waitFor(() => {
      expect(screen.getByText("No reports yet.")).toBeDefined();
    });

    expect(
      screen.getByText(
        "Upload your first medical report to get started"
      )
    ).toBeDefined();
  });

  it("shows loading state", async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { default: ReportList } = await import(
      "@/components/reports/ReportList"
    );
    render(React.createElement(ReportList));

    expect(screen.getByText("Loading your reports...")).toBeDefined();
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const { default: ReportList } = await import(
      "@/components/reports/ReportList"
    );
    render(React.createElement(ReportList));

    await waitFor(() => {
      expect(screen.getByText("Failed to load reports")).toBeDefined();
    });

    expect(screen.getByText("Try Again")).toBeDefined();
  });
});
