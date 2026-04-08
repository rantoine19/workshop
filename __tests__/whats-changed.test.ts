import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

// ── Changes API Route ─────────────────────────────────────────────

describe("Changes API Route", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/reports/[id]/changes/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

// ── Trend Integration ──────────────────────────────────────────────

import { calculateBiomarkerTrend } from "@/lib/health/trend";

describe("Trend calculation integration for changes banner", () => {
  it("detects improving LDL (lower-is-better, value decreased)", () => {
    expect(calculateBiomarkerTrend("LDL Cholesterol", 180, 130)).toBe(
      "improving"
    );
  });

  it("detects worsening glucose (lower-is-better, value increased)", () => {
    expect(calculateBiomarkerTrend("Glucose", 90, 140)).toBe("worsening");
  });

  it("detects stable when change is minimal", () => {
    expect(calculateBiomarkerTrend("Hemoglobin", 14.0, 14.1)).toBe("stable");
  });

  it("returns stable for unknown biomarker even with large change", () => {
    expect(calculateBiomarkerTrend("Unknown Marker XYZ", 10, 200)).toBe(
      "stable"
    );
  });
});

// ── WhatsChanged Component ─────────────────────────────────────────

describe("WhatsChanged Component", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  it("renders nothing when there is no previous report", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasChanges: false }),
    });

    const { default: WhatsChanged } = await import(
      "@/components/reports/WhatsChanged"
    );
    const { container } = render(
      React.createElement(WhatsChanged, { reportId: "report-1" })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/reports/report-1/changes");
    });

    // Should render nothing
    expect(container.querySelector(".whats-changed")).toBeNull();
  });

  it("renders improved and worsened counts when changes exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hasChanges: true,
        previousReportName: "blood_test_jan.pdf",
        previousReportDate: "2026-01-15T00:00:00Z",
        previousReportId: "prev-1",
        improved: [
          {
            name: "LDL Cholesterol",
            oldValue: 180,
            newValue: 130,
            unit: "mg/dL",
            trend: "improving",
          },
          {
            name: "HDL Cholesterol",
            oldValue: 35,
            newValue: 50,
            unit: "mg/dL",
            trend: "improving",
          },
        ],
        worsened: [
          {
            name: "Glucose",
            oldValue: 90,
            newValue: 140,
            unit: "mg/dL",
            trend: "worsening",
          },
        ],
        stable: 5,
        new: 2,
      }),
    });

    const { default: WhatsChanged } = await import(
      "@/components/reports/WhatsChanged"
    );
    render(
      React.createElement(WhatsChanged, { reportId: "report-2" })
    );

    await waitFor(() => {
      expect(screen.getByTestId("whats-changed")).toBeDefined();
    });

    expect(screen.getByText("2 improved")).toBeDefined();
    expect(screen.getByText("1 need attention")).toBeDefined();
    expect(screen.getByText("5 stable")).toBeDefined();
    expect(screen.getByText("2 new")).toBeDefined();
    // Date may render as Jan 14 or Jan 15 depending on timezone
    expect(screen.getByText(/Jan 1[45]/)).toBeDefined();
    expect(screen.getByText("See full comparison →")).toBeDefined();
  });

  it("expands details on toggle click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hasChanges: true,
        previousReportName: "test.pdf",
        previousReportDate: "2026-01-01T00:00:00Z",
        previousReportId: "prev-1",
        improved: [
          {
            name: "Total Cholesterol",
            oldValue: 240,
            newValue: 190,
            unit: "mg/dL",
            trend: "improving",
          },
        ],
        worsened: [],
        stable: 3,
        new: 0,
      }),
    });

    const { default: WhatsChanged } = await import(
      "@/components/reports/WhatsChanged"
    );
    render(
      React.createElement(WhatsChanged, { reportId: "report-3" })
    );

    await waitFor(() => {
      expect(screen.getByText("Show details")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Show details"));

    expect(screen.getByText("Total Cholesterol")).toBeDefined();
    expect(screen.getByText("Hide details")).toBeDefined();
  });

  it("renders nothing when API request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { default: WhatsChanged } = await import(
      "@/components/reports/WhatsChanged"
    );
    const { container } = render(
      React.createElement(WhatsChanged, { reportId: "report-4" })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Wait a tick for state to settle
    await waitFor(() => {
      expect(container.querySelector(".whats-changed")).toBeNull();
    });
  });

  it("links to full comparison with correct report IDs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hasChanges: true,
        previousReportName: "test.pdf",
        previousReportDate: "2026-02-01T00:00:00Z",
        previousReportId: "prev-abc",
        improved: [
          {
            name: "HDL Cholesterol",
            oldValue: 30,
            newValue: 55,
            unit: "mg/dL",
            trend: "improving",
          },
        ],
        worsened: [],
        stable: 0,
        new: 0,
      }),
    });

    const { default: WhatsChanged } = await import(
      "@/components/reports/WhatsChanged"
    );
    render(
      React.createElement(WhatsChanged, { reportId: "current-xyz" })
    );

    await waitFor(() => {
      const link = screen.getByText("See full comparison →");
      expect(link.getAttribute("href")).toBe(
        "/reports/compare?ids=prev-abc,current-xyz"
      );
    });
  });
});
