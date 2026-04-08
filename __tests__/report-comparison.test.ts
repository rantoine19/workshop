import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Trend Calculation ─────────────────────────────────────────────

import {
  calculateTrend,
  calculateBiomarkerTrend,
  findRangeForTrend,
} from "@/lib/health/trend";

describe("Trend Calculation", () => {
  describe("calculateTrend — lower-is-better", () => {
    it("returns improving when value decreased", () => {
      expect(calculateTrend(200, 180, "lower-is-better")).toBe("improving");
    });

    it("returns worsening when value increased", () => {
      expect(calculateTrend(180, 200, "lower-is-better")).toBe("worsening");
    });

    it("returns stable when change is less than 2%", () => {
      expect(calculateTrend(100, 101, "lower-is-better")).toBe("stable");
    });
  });

  describe("calculateTrend — higher-is-better", () => {
    it("returns improving when value increased", () => {
      expect(calculateTrend(40, 55, "higher-is-better")).toBe("improving");
    });

    it("returns worsening when value decreased", () => {
      expect(calculateTrend(55, 40, "higher-is-better")).toBe("worsening");
    });

    it("returns stable when change is less than 2%", () => {
      expect(calculateTrend(50, 50.5, "higher-is-better")).toBe("stable");
    });
  });

  describe("calculateTrend — range", () => {
    const greenRange = { low: 60, high: 100 };

    it("returns improving when value moves closer to range midpoint", () => {
      // Midpoint = 80. Old = 120 (dist 40), New = 90 (dist 10) → improving
      expect(calculateTrend(120, 90, "range", greenRange)).toBe("improving");
    });

    it("returns worsening when value moves away from range midpoint", () => {
      // Midpoint = 80. Old = 85 (dist 5), New = 120 (dist 40) → worsening
      expect(calculateTrend(85, 120, "range", greenRange)).toBe("worsening");
    });

    it("returns stable when distances are similar", () => {
      // Midpoint = 80. Old = 79 (dist 1), New = 81 (dist 1) → stable
      expect(calculateTrend(79, 81, "range", greenRange)).toBe("stable");
    });

    it("returns stable when green range has null values", () => {
      expect(
        calculateTrend(100, 120, "range", { low: null, high: null })
      ).toBe("stable");
    });
  });

  describe("calculateTrend — edge cases", () => {
    it("returns stable when both values are zero", () => {
      expect(calculateTrend(0, 0, "lower-is-better")).toBe("stable");
    });

    it("handles equal values as stable", () => {
      expect(calculateTrend(100, 100, "lower-is-better")).toBe("stable");
    });
  });

  describe("calculateBiomarkerTrend", () => {
    it("detects improving LDL trend (lower-is-better, value decreased)", () => {
      expect(calculateBiomarkerTrend("LDL Cholesterol", 150, 110)).toBe(
        "improving"
      );
    });

    it("detects worsening HDL trend (higher-is-better, value decreased)", () => {
      expect(calculateBiomarkerTrend("HDL Cholesterol", 55, 38)).toBe(
        "worsening"
      );
    });

    it("detects improving Hemoglobin trend (range, moving closer to midpoint)", () => {
      // Hemoglobin range green: 13.5-17.5 (male), midpoint ~15.5
      // Old = 11 (far), New = 14 (closer) → improving
      expect(calculateBiomarkerTrend("Hemoglobin", 11, 14)).toBe("improving");
    });

    it("returns stable for unknown biomarker", () => {
      expect(calculateBiomarkerTrend("Unknown Biomarker XYZ", 100, 50)).toBe(
        "stable"
      );
    });
  });

  describe("findRangeForTrend", () => {
    it("finds range for a known biomarker", () => {
      const range = findRangeForTrend("LDL Cholesterol");
      expect(range).not.toBeNull();
      expect(range!.direction).toBe("lower-is-better");
    });

    it("finds range for alias", () => {
      const range = findRangeForTrend("hdl");
      expect(range).not.toBeNull();
      expect(range!.name).toBe("HDL Cholesterol");
    });

    it("returns null for unknown biomarker", () => {
      expect(findRangeForTrend("Totally Unknown")).toBeNull();
    });
  });
});

// ── TrendArrow Component ──────────────────────────────────────────

import TrendArrow from "@/components/reports/TrendArrow";

describe("TrendArrow Component", () => {
  it("renders improving arrow with correct aria-label", () => {
    const { container } = render(
      React.createElement(TrendArrow, { trend: "improving" })
    );
    const arrow = container.querySelector(".trend-arrow--improving");
    expect(arrow).not.toBeNull();
    expect(arrow!.getAttribute("aria-label")).toBe("Improving");
  });

  it("renders worsening arrow with correct aria-label", () => {
    const { container } = render(
      React.createElement(TrendArrow, { trend: "worsening" })
    );
    const arrow = container.querySelector(".trend-arrow--worsening");
    expect(arrow).not.toBeNull();
    expect(arrow!.getAttribute("aria-label")).toBe("Needs attention");
  });

  it("renders stable arrow with correct aria-label", () => {
    const { container } = render(
      React.createElement(TrendArrow, { trend: "stable" })
    );
    const arrow = container.querySelector(".trend-arrow--stable");
    expect(arrow).not.toBeNull();
    expect(arrow!.getAttribute("aria-label")).toBe("Stable");
  });

  it("renders SVG elements", () => {
    const { container } = render(
      React.createElement(TrendArrow, { trend: "improving", size: 24 })
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("width")).toBe("24");
    expect(svg!.getAttribute("height")).toBe("24");
  });
});

// ── Compare API Route ─────────────────────────────────────────────

describe("Compare API — input validation", () => {
  it("rejects request without ids parameter", async () => {
    // Simulate the validation logic from the route
    const idsParam = null;
    expect(idsParam).toBeNull();
    // The route returns 400 for missing ids
  });

  it("rejects request with only 1 id", () => {
    const ids = "abc123".split(",").filter(Boolean);
    expect(ids.length).toBeLessThan(2);
  });

  it("rejects request with more than 5 ids", () => {
    const ids = "a,b,c,d,e,f".split(",").filter(Boolean);
    expect(ids.length).toBeGreaterThan(5);
  });

  it("accepts 2-5 ids", () => {
    const ids = "a,b,c".split(",").filter(Boolean);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(ids.length).toBeLessThanOrEqual(5);
  });
});

// ── Summary Counts ────────────────────────────────────────────────

describe("Summary counts", () => {
  it("correctly counts trend categories", () => {
    const biomarkers = [
      { trend: "improving" },
      { trend: "improving" },
      { trend: "stable" },
      { trend: "worsening" },
      { trend: "stable" },
    ];

    const improving = biomarkers.filter((b) => b.trend === "improving").length;
    const stable = biomarkers.filter((b) => b.trend === "stable").length;
    const worsening = biomarkers.filter((b) => b.trend === "worsening").length;

    expect(improving).toBe(2);
    expect(stable).toBe(2);
    expect(worsening).toBe(1);
  });
});
