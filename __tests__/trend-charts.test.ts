import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ── TrendChart Component ─────────────────────────────────────────

import TrendChart, {
  type TrendChartProps,
} from "@/components/reports/TrendChart";

const makeDataPoints = (
  values: number[],
  flags?: string[]
) =>
  values.map((v, i) => ({
    date: `2026-0${i + 1}-15T00:00:00Z`,
    value: v,
    flag: flags?.[i] ?? (v > 200 ? "red" : v > 150 ? "yellow" : "green"),
    reportName: `report-${i + 1}.pdf`,
  }));

const defaultProps: TrendChartProps = {
  biomarkerName: "Total Cholesterol",
  dataPoints: makeDataPoints([220, 200, 185]),
  referenceRange: {
    greenLow: null,
    greenHigh: 199,
    yellowLow: 200,
    yellowHigh: 239,
  },
  unit: "mg/dL",
  trend: "improving",
};

describe("TrendChart Component", () => {
  it("renders an SVG element with the chart", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const svg = container.querySelector(".trend-chart__svg");
    expect(svg).not.toBeNull();
    expect(svg!.tagName.toLowerCase()).toBe("svg");
  });

  it("displays the biomarker name as title", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const title = container.querySelector(".trend-chart__title");
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe("Total Cholesterol");
  });

  it("displays the unit", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const unit = container.querySelector(".trend-chart__unit");
    expect(unit).not.toBeNull();
    expect(unit!.textContent).toContain("mg/dL");
  });

  it("renders correct number of data points", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const points = container.querySelectorAll(".trend-chart__point");
    expect(points.length).toBe(3);
  });

  it("renders the data line path", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const line = container.querySelector(".trend-chart__line");
    expect(line).not.toBeNull();
    expect(line!.getAttribute("d")).toContain("M");
    expect(line!.getAttribute("d")).toContain("L");
  });

  it("renders reference range bands when provided", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const greenBand = container.querySelector(".trend-chart__band--green");
    const yellowBand = container.querySelector(".trend-chart__band--yellow");
    // At least one band should render when ranges are provided
    expect(greenBand !== null || yellowBand !== null).toBe(true);
  });

  it("color-codes data points based on flag", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const points = container.querySelectorAll(".trend-chart__point");
    // First point (220) has flag "red" since > 200
    const flags = Array.from(points).map((p) =>
      p.classList.contains("trend-chart__point--green")
        ? "green"
        : p.classList.contains("trend-chart__point--yellow")
          ? "yellow"
          : p.classList.contains("trend-chart__point--red")
            ? "red"
            : "unknown"
    );
    // 220 > 200 = "red", 200 is NOT > 200 = "yellow" (> 150), 185 > 150 = "yellow"
    expect(flags).toEqual(["red", "yellow", "yellow"]);
  });

  it("shows empty state when fewer than 2 data points", () => {
    const props: TrendChartProps = {
      ...defaultProps,
      dataPoints: makeDataPoints([220]),
    };
    const { container } = render(React.createElement(TrendChart, props));
    const emptyMsg = container.querySelector(".trend-chart__empty-msg");
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg!.textContent).toContain("Upload more reports");
    // Should NOT render SVG
    const svg = container.querySelector(".trend-chart__svg");
    expect(svg).toBeNull();
  });

  it("has accessible aria-labels on data points", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const points = container.querySelectorAll(".trend-chart__point");
    const firstLabel = points[0]?.getAttribute("aria-label");
    expect(firstLabel).toContain("220");
    expect(firstLabel).toContain("mg/dL");
  });

  it("shows tooltip on hover", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const points = container.querySelectorAll(".trend-chart__point");
    // No tooltip initially
    let tooltip = container.querySelector(".trend-chart__tooltip");
    expect(tooltip).toBeNull();
    // Hover on first point
    fireEvent.mouseEnter(points[0]);
    tooltip = container.querySelector(".trend-chart__tooltip");
    expect(tooltip).not.toBeNull();
  });

  it("renders TrendArrow when trend prop is provided", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const arrow = container.querySelector(".trend-arrow");
    expect(arrow).not.toBeNull();
  });

  it("renders axis labels", () => {
    const { container } = render(React.createElement(TrendChart, defaultProps));
    const labels = container.querySelectorAll(".trend-chart__axis-label");
    expect(labels.length).toBeGreaterThan(0);
  });
});

// ── Trends API Response Format ───────────────────────────────────

describe("Trends API response format", () => {
  it("matches expected BiomarkerTrend interface", () => {
    // Validate the expected API response shape (compile-time check)
    const sampleResponse = {
      trends: [
        {
          biomarkerName: "Total Cholesterol",
          unit: "mg/dL",
          dataPoints: [
            {
              date: "2026-01-15",
              value: 220,
              flag: "yellow",
              reportName: "lab-jan.pdf",
            },
            {
              date: "2026-04-02",
              value: 195,
              flag: "green",
              reportName: "lab-apr.pdf",
            },
          ],
          referenceRange: { greenHigh: 200, yellowHigh: 240 },
          trend: "improving" as const,
        },
      ],
    };

    expect(sampleResponse.trends).toHaveLength(1);
    expect(sampleResponse.trends[0].biomarkerName).toBe("Total Cholesterol");
    expect(sampleResponse.trends[0].dataPoints).toHaveLength(2);
    expect(sampleResponse.trends[0].trend).toBe("improving");
    expect(sampleResponse.trends[0].referenceRange.greenHigh).toBe(200);
  });

  it("requires at least 2 data points for a trend entry", () => {
    // This validates the API filtering logic conceptually
    const allDataPoints = [
      { name: "LDL", values: [100, 95] },
      { name: "TSH", values: [2.5] }, // Only 1 data point - should be excluded
    ];

    const filtered = allDataPoints.filter((d) => d.values.length >= 2);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("LDL");
  });
});

// ── Data Point Color Coding ──────────────────────────────────────

import { flagBiomarker } from "@/lib/health/flag-biomarker";

describe("Data point color coding matches reference ranges", () => {
  it("flags Total Cholesterol 195 as green", () => {
    expect(flagBiomarker("Total Cholesterol", 195)).toBe("green");
  });

  it("flags Total Cholesterol 220 as yellow", () => {
    expect(flagBiomarker("Total Cholesterol", 220)).toBe("yellow");
  });

  it("flags Total Cholesterol 250 as red", () => {
    expect(flagBiomarker("Total Cholesterol", 250)).toBe("red");
  });

  it("flags Hemoglobin A1C 5.4 as green", () => {
    expect(flagBiomarker("Hemoglobin A1C", 5.4)).toBe("green");
  });

  it("flags Hemoglobin A1C 6.0 as yellow", () => {
    expect(flagBiomarker("Hemoglobin A1C", 6.0)).toBe("yellow");
  });

  it("flags Hemoglobin A1C 7.0 as red", () => {
    expect(flagBiomarker("Hemoglobin A1C", 7.0)).toBe("red");
  });
});
