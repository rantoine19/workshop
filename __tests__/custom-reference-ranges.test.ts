import { describe, it, expect } from "vitest";
import {
  flagBiomarker,
  flagBiomarkerWithCustomRanges,
  applyServerSideFlags,
  type CustomRange,
} from "@/lib/health/flag-biomarker";

// ---------------------------------------------------------------------------
// Helper: build a CustomRange
// ---------------------------------------------------------------------------

function makeCustomRange(
  overrides: Partial<CustomRange> & { biomarker_name: string }
): CustomRange {
  return {
    green_low: null,
    green_high: null,
    yellow_low: null,
    yellow_high: null,
    red_low: null,
    red_high: null,
    direction: "range",
    source: "Test Doctor",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// flagBiomarkerWithCustomRanges
// ---------------------------------------------------------------------------

describe("flagBiomarkerWithCustomRanges", () => {
  describe("custom range overrides default", () => {
    it("uses custom green range instead of default", () => {
      // Default Glucose green is <= 99. Custom extends to 110.
      const customRanges: CustomRange[] = [
        makeCustomRange({
          biomarker_name: "Glucose (Fasting)",
          green_low: null,
          green_high: 110,
          yellow_low: 111,
          yellow_high: 139,
          direction: "lower-is-better",
        }),
      ];

      // 105 would be yellow with default, but green with custom
      expect(flagBiomarker("Glucose", 105)).toBe("yellow");
      expect(
        flagBiomarkerWithCustomRanges("Glucose (Fasting)", 105, customRanges)
      ).toBe("green");
    });

    it("applies custom range for lower-is-better direction", () => {
      const customRanges: CustomRange[] = [
        makeCustomRange({
          biomarker_name: "Total Cholesterol",
          green_low: null,
          green_high: 220,
          yellow_low: 221,
          yellow_high: 260,
          direction: "lower-is-better",
        }),
      ];

      // 210 is yellow by default (200-239), but green with custom (<=220)
      expect(flagBiomarker("Total Cholesterol", 210)).toBe("yellow");
      expect(
        flagBiomarkerWithCustomRanges("Total Cholesterol", 210, customRanges)
      ).toBe("green");
    });

    it("applies custom range for higher-is-better direction", () => {
      const customRanges: CustomRange[] = [
        makeCustomRange({
          biomarker_name: "HDL Cholesterol",
          green_low: 50,
          green_high: null,
          yellow_low: 35,
          yellow_high: 49,
          direction: "higher-is-better",
        }),
      ];

      // 45 is yellow for male by default (40-60), but also yellow with custom (35-49)
      expect(
        flagBiomarkerWithCustomRanges("HDL Cholesterol", 45, customRanges, "male")
      ).toBe("yellow");

      // 50 would be yellow for male by default (40-60), but green with custom (>=50)
      expect(
        flagBiomarkerWithCustomRanges("HDL Cholesterol", 50, customRanges, "male")
      ).toBe("green");
    });

    it("applies custom range with range direction", () => {
      const customRanges: CustomRange[] = [
        makeCustomRange({
          biomarker_name: "TSH",
          green_low: 0.5,
          green_high: 3.0,
          yellow_low: 0.3,
          yellow_high: 5.0,
          direction: "range",
        }),
      ];

      // 3.5 is green by default (0.4-4.0), but yellow with custom
      expect(flagBiomarker("TSH", 3.5)).toBe("green");
      expect(
        flagBiomarkerWithCustomRanges("TSH", 3.5, customRanges)
      ).toBe("yellow");
    });
  });

  describe("falls back to default when no custom range matches", () => {
    it("uses default range for biomarker not in custom ranges", () => {
      const customRanges: CustomRange[] = [
        makeCustomRange({
          biomarker_name: "Glucose (Fasting)",
          green_low: null,
          green_high: 110,
          yellow_low: 111,
          yellow_high: 139,
          direction: "lower-is-better",
        }),
      ];

      // Cholesterol has no custom range, should use default
      expect(
        flagBiomarkerWithCustomRanges("Total Cholesterol", 240, customRanges)
      ).toBe("red");
    });

    it("uses default range when customRanges is empty", () => {
      expect(
        flagBiomarkerWithCustomRanges("Glucose", 126, [])
      ).toBe("red");
    });

    it("uses default range when customRanges is undefined", () => {
      expect(
        flagBiomarkerWithCustomRanges("Glucose", 126, undefined)
      ).toBe("red");
    });
  });

  describe("skips non-risk measurements", () => {
    it("returns green for height even with custom ranges", () => {
      const customRanges: CustomRange[] = [];
      expect(
        flagBiomarkerWithCustomRanges("height", 170, customRanges)
      ).toBe("green");
    });

    it("returns green for weight", () => {
      expect(
        flagBiomarkerWithCustomRanges("weight", 80, [])
      ).toBe("green");
    });
  });

  describe("returns null for unknown biomarkers", () => {
    it("returns null when neither custom nor default range exists", () => {
      const customRanges: CustomRange[] = [];
      expect(
        flagBiomarkerWithCustomRanges("Mystery Marker XYZ", 42, customRanges)
      ).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// applyServerSideFlags with customRanges
// ---------------------------------------------------------------------------

describe("applyServerSideFlags with customRanges", () => {
  it("applies custom range overrides to biomarker array", () => {
    const customRanges: CustomRange[] = [
      makeCustomRange({
        biomarker_name: "glucose",
        green_low: null,
        green_high: 130,
        yellow_low: 131,
        yellow_high: 160,
        direction: "lower-is-better",
      }),
    ];

    const biomarkers = [
      {
        name: "Glucose",
        value: 126,
        unit: "mg/dL",
        flag: "green" as const,
        reference_low: null,
        reference_high: null,
      },
    ];

    // Without custom ranges, 126 = red (default green <= 99)
    const defaultResult = applyServerSideFlags(biomarkers);
    expect(defaultResult[0].flag).toBe("red");

    // With custom ranges, 126 = green (custom green <= 130)
    const customResult = applyServerSideFlags(biomarkers, undefined, customRanges);
    expect(customResult[0].flag).toBe("green");
  });

  it("uses default for biomarkers without custom range", () => {
    const customRanges: CustomRange[] = [
      makeCustomRange({
        biomarker_name: "glucose",
        green_low: null,
        green_high: 130,
        yellow_low: 131,
        yellow_high: 160,
        direction: "lower-is-better",
      }),
    ];

    const biomarkers = [
      {
        name: "Total Cholesterol",
        value: 240,
        unit: "mg/dL",
        flag: "green" as const,
        reference_low: null,
        reference_high: null,
      },
    ];

    // Cholesterol 240 = red by default, no custom range
    const result = applyServerSideFlags(biomarkers, undefined, customRanges);
    expect(result[0].flag).toBe("red");
  });

  it("handles mixed custom and default ranges", () => {
    const customRanges: CustomRange[] = [
      makeCustomRange({
        biomarker_name: "glucose",
        green_low: null,
        green_high: 130,
        yellow_low: 131,
        yellow_high: 160,
        direction: "lower-is-better",
      }),
    ];

    const biomarkers = [
      {
        name: "Glucose",
        value: 126,
        unit: "mg/dL",
        flag: "green" as const,
        reference_low: null,
        reference_high: null,
      },
      {
        name: "Blood Pressure Systolic",
        value: 140,
        unit: "mmHg",
        flag: "green" as const,
        reference_low: null,
        reference_high: null,
      },
    ];

    const result = applyServerSideFlags(biomarkers, undefined, customRanges);
    expect(result[0].flag).toBe("green"); // Glucose: custom range, 126 <= 130
    expect(result[1].flag).toBe("red"); // BP: default, 140 = red
  });

  it("skips null-value biomarkers", () => {
    const customRanges: CustomRange[] = [
      makeCustomRange({
        biomarker_name: "glucose",
        green_low: null,
        green_high: 130,
        direction: "lower-is-better",
      }),
    ];

    const biomarkers = [
      {
        name: "Glucose",
        value: null,
        unit: "mg/dL",
        flag: "green" as const,
        reference_low: null,
        reference_high: null,
      },
    ];

    const result = applyServerSideFlags(biomarkers, undefined, customRanges);
    expect(result[0].flag).toBe("green"); // Unchanged — null value
  });
});

// ---------------------------------------------------------------------------
// Custom Reference Ranges API validation (unit tests for logic)
// ---------------------------------------------------------------------------

describe("Custom Range API validation", () => {
  it("validates direction values", () => {
    const validDirections = ["lower-is-better", "higher-is-better", "range"];
    for (const dir of validDirections) {
      const cr = makeCustomRange({
        biomarker_name: "Test",
        direction: dir as CustomRange["direction"],
      });
      expect(validDirections).toContain(cr.direction);
    }
  });

  it("handles null threshold values correctly", () => {
    const cr = makeCustomRange({
      biomarker_name: "LDL Cholesterol",
      green_low: null,
      green_high: 100,
      yellow_low: 101,
      yellow_high: 130,
      direction: "lower-is-better",
    });

    // 90 should be green (below green_high)
    expect(
      flagBiomarkerWithCustomRanges("LDL Cholesterol", 90, [cr])
    ).toBe("green");

    // 115 should be yellow
    expect(
      flagBiomarkerWithCustomRanges("LDL Cholesterol", 115, [cr])
    ).toBe("yellow");

    // 140 should be red (above yellow_high)
    expect(
      flagBiomarkerWithCustomRanges("LDL Cholesterol", 140, [cr])
    ).toBe("red");
  });
});
