import { describe, it, expect } from "vitest";
import { flagBiomarker, applyServerSideFlags } from "@/lib/health/flag-biomarker";
import {
  calculateBMI,
  calculateCholesterolHDLRatio,
  calculateWaistHeightRatio,
} from "@/lib/health/calculated-metrics";

// ---------------------------------------------------------------------------
// flagBiomarker — lower-is-better biomarkers
// ---------------------------------------------------------------------------

describe("flagBiomarker", () => {
  describe("Blood Pressure Systolic", () => {
    it("flags 119 as green", () => {
      expect(flagBiomarker("Blood Pressure Systolic", 119)).toBe("green");
    });
    it("flags 120 as yellow", () => {
      expect(flagBiomarker("Blood Pressure Systolic", 120)).toBe("yellow");
    });
    it("flags 139 as yellow", () => {
      expect(flagBiomarker("Blood Pressure Systolic", 139)).toBe("yellow");
    });
    it("flags 140 as red", () => {
      expect(flagBiomarker("Blood Pressure Systolic", 140)).toBe("red");
    });
    it("flags 190 as red (the bug scenario)", () => {
      expect(flagBiomarker("Blood Pressure Systolic", 190)).toBe("red");
    });
  });

  describe("Blood Pressure Diastolic", () => {
    it("flags 79 as green", () => {
      expect(flagBiomarker("Blood Pressure Diastolic", 79)).toBe("green");
    });
    it("flags 80 as yellow", () => {
      expect(flagBiomarker("Blood Pressure Diastolic", 80)).toBe("yellow");
    });
    it("flags 89 as yellow", () => {
      expect(flagBiomarker("Blood Pressure Diastolic", 89)).toBe("yellow");
    });
    it("flags 90 as red", () => {
      expect(flagBiomarker("Blood Pressure Diastolic", 90)).toBe("red");
    });
    it("flags 140 as red (the bug scenario)", () => {
      expect(flagBiomarker("Blood Pressure Diastolic", 140)).toBe("red");
    });
  });

  describe("Total Cholesterol", () => {
    it("flags 199 as green", () => {
      expect(flagBiomarker("Total Cholesterol", 199)).toBe("green");
    });
    it("flags 200 as yellow", () => {
      expect(flagBiomarker("Total Cholesterol", 200)).toBe("yellow");
    });
    it("flags 239 as yellow", () => {
      expect(flagBiomarker("Total Cholesterol", 239)).toBe("yellow");
    });
    it("flags 240 as red", () => {
      expect(flagBiomarker("Total Cholesterol", 240)).toBe("red");
    });
  });

  describe("Triglycerides", () => {
    it("flags 149 as green", () => {
      expect(flagBiomarker("Triglycerides", 149)).toBe("green");
    });
    it("flags 150 as yellow", () => {
      expect(flagBiomarker("Triglycerides", 150)).toBe("yellow");
    });
    it("flags 200 as red", () => {
      expect(flagBiomarker("Triglycerides", 200)).toBe("red");
    });
  });

  describe("LDL Cholesterol", () => {
    it("flags 99 as green", () => {
      expect(flagBiomarker("LDL", 99)).toBe("green");
    });
    it("flags 100 as yellow", () => {
      expect(flagBiomarker("LDL", 100)).toBe("yellow");
    });
    it("flags 129 as yellow", () => {
      expect(flagBiomarker("LDL", 129)).toBe("yellow");
    });
    it("flags 130 as red", () => {
      expect(flagBiomarker("LDL", 130)).toBe("red");
    });
  });

  describe("Glucose (Fasting)", () => {
    it("flags 99 as green", () => {
      expect(flagBiomarker("Glucose", 99)).toBe("green");
    });
    it("flags 100 as yellow", () => {
      expect(flagBiomarker("Glucose", 100)).toBe("yellow");
    });
    it("flags 125 as yellow", () => {
      expect(flagBiomarker("Glucose", 125)).toBe("yellow");
    });
    it("flags 126 as red (the bug scenario)", () => {
      expect(flagBiomarker("Glucose", 126)).toBe("red");
    });
  });

  describe("A1C", () => {
    it("flags 5.6 as green", () => {
      expect(flagBiomarker("A1C", 5.6)).toBe("green");
    });
    it("flags 5.7 as yellow", () => {
      expect(flagBiomarker("A1C", 5.7)).toBe("yellow");
    });
    it("flags 6.4 as yellow", () => {
      expect(flagBiomarker("A1C", 6.4)).toBe("yellow");
    });
    it("flags 6.5 as red", () => {
      expect(flagBiomarker("A1C", 6.5)).toBe("red");
    });
  });

  describe("Cholesterol/HDL Ratio", () => {
    it("flags 4.9 as green", () => {
      expect(flagBiomarker("Cholesterol/HDL Ratio", 4.9)).toBe("green");
    });
    it("flags 5.0 as yellow", () => {
      expect(flagBiomarker("Cholesterol/HDL Ratio", 5.0)).toBe("yellow");
    });
    it("flags 6.0 as red", () => {
      expect(flagBiomarker("Cholesterol/HDL Ratio", 6.0)).toBe("red");
    });
  });

  describe("Waist-to-Height Ratio", () => {
    it("flags 0.49 as green", () => {
      expect(flagBiomarker("Waist-to-Height Ratio", 0.49)).toBe("green");
    });
    it("flags 0.5 as yellow", () => {
      expect(flagBiomarker("Waist-to-Height Ratio", 0.5)).toBe("yellow");
    });
    it("flags 0.61 as red", () => {
      expect(flagBiomarker("Waist-to-Height Ratio", 0.61)).toBe("red");
    });
  });

  // -------------------------------------------------------------------------
  // higher-is-better biomarkers
  // -------------------------------------------------------------------------

  describe("HDL Cholesterol (male)", () => {
    it("flags 61 as green", () => {
      expect(flagBiomarker("HDL", 61, "male")).toBe("green");
    });
    it("flags 50 as yellow", () => {
      expect(flagBiomarker("HDL", 50, "male")).toBe("yellow");
    });
    it("flags 39 as red", () => {
      expect(flagBiomarker("HDL", 39, "male")).toBe("red");
    });
  });

  describe("HDL Cholesterol (female)", () => {
    it("flags 61 as green", () => {
      expect(flagBiomarker("HDL", 61, "female")).toBe("green");
    });
    it("flags 55 as yellow", () => {
      expect(flagBiomarker("HDL", 55, "female")).toBe("yellow");
    });
    it("flags 49 as red", () => {
      expect(flagBiomarker("HDL", 49, "female")).toBe("red");
    });
  });

  // -------------------------------------------------------------------------
  // range-type biomarkers
  // -------------------------------------------------------------------------

  describe("Resting Heart Rate", () => {
    it("flags 70 as green", () => {
      expect(flagBiomarker("Resting Heart Rate", 70)).toBe("green");
    });
    it("flags 110 as yellow", () => {
      expect(flagBiomarker("Resting Heart Rate", 110)).toBe("yellow");
    });
    it("flags 185 as red", () => {
      expect(flagBiomarker("Resting Heart Rate", 185)).toBe("red");
    });
  });

  describe("Hemoglobin (male)", () => {
    it("flags 15.0 as green", () => {
      expect(flagBiomarker("Hemoglobin", 15.0, "male")).toBe("green");
    });
    it("flags 12.5 as yellow (below normal)", () => {
      expect(flagBiomarker("Hemoglobin", 12.5, "male")).toBe("yellow");
    });
    it("flags 10.0 as red (critically low)", () => {
      expect(flagBiomarker("Hemoglobin", 10.0, "male")).toBe("red");
    });
  });

  describe("Hemoglobin (female)", () => {
    it("flags 14.0 as green", () => {
      expect(flagBiomarker("Hemoglobin", 14.0, "female")).toBe("green");
    });
    it("flags 10.5 as yellow (low boundary)", () => {
      expect(flagBiomarker("Hemoglobin", 10.5, "female")).toBe("yellow");
    });
    it("flags 9.0 as red (critically low)", () => {
      expect(flagBiomarker("Hemoglobin", 9.0, "female")).toBe("red");
    });
  });

  describe("WBC", () => {
    it("flags 7000 as green", () => {
      expect(flagBiomarker("WBC", 7000)).toBe("green");
    });
    it("flags 12000 as yellow", () => {
      expect(flagBiomarker("WBC", 12000)).toBe("yellow");
    });
    it("flags 15000 as red", () => {
      expect(flagBiomarker("WBC", 15000)).toBe("red");
    });
  });

  describe("Platelet Count", () => {
    it("flags 250000 as green", () => {
      expect(flagBiomarker("Platelet Count", 250000)).toBe("green");
    });
    it("flags 130000 as yellow", () => {
      expect(flagBiomarker("Platelet Count", 130000)).toBe("yellow");
    });
    it("flags 100000 as red", () => {
      expect(flagBiomarker("Platelet Count", 100000)).toBe("red");
    });
  });

  describe("Creatinine (gender-specific)", () => {
    it("flags male 1.0 as green", () => {
      expect(flagBiomarker("Creatinine", 1.0, "male")).toBe("green");
    });
    it("flags female 0.8 as green", () => {
      expect(flagBiomarker("Creatinine", 0.8, "female")).toBe("green");
    });
    it("flags male 1.5 as yellow", () => {
      expect(flagBiomarker("Creatinine", 1.5, "male")).toBe("yellow");
    });
    it("flags female 1.3 as yellow", () => {
      expect(flagBiomarker("Creatinine", 1.3, "female")).toBe("yellow");
    });
  });

  describe("Sodium", () => {
    it("flags 140 as green", () => {
      expect(flagBiomarker("Sodium", 140)).toBe("green");
    });
    it("flags 132 as yellow", () => {
      expect(flagBiomarker("Sodium", 132)).toBe("yellow");
    });
    it("flags 125 as red", () => {
      expect(flagBiomarker("Sodium", 125)).toBe("red");
    });
  });

  describe("Potassium", () => {
    it("flags 4.0 as green", () => {
      expect(flagBiomarker("Potassium", 4.0)).toBe("green");
    });
    it("flags 3.2 as yellow", () => {
      expect(flagBiomarker("Potassium", 3.2)).toBe("yellow");
    });
    it("flags 6.0 as red", () => {
      expect(flagBiomarker("Potassium", 6.0)).toBe("red");
    });
  });

  describe("TSH", () => {
    it("flags 2.0 as green", () => {
      expect(flagBiomarker("TSH", 2.0)).toBe("green");
    });
    it("flags 5.0 as yellow", () => {
      expect(flagBiomarker("TSH", 5.0)).toBe("yellow");
    });
    it("flags 7.0 as red", () => {
      expect(flagBiomarker("TSH", 7.0)).toBe("red");
    });
  });

  describe("ALT", () => {
    it("flags 30 as green", () => {
      expect(flagBiomarker("ALT", 30)).toBe("green");
    });
    it("flags 65 as yellow", () => {
      expect(flagBiomarker("ALT", 65)).toBe("yellow");
    });
    it("flags 80 as red", () => {
      expect(flagBiomarker("ALT", 80)).toBe("red");
    });
  });

  describe("Vitamin D", () => {
    it("flags 50 as green", () => {
      expect(flagBiomarker("Vitamin D", 50)).toBe("green");
    });
    it("flags 25 as yellow", () => {
      expect(flagBiomarker("Vitamin D", 25)).toBe("yellow");
    });
    it("flags 10 as red", () => {
      expect(flagBiomarker("Vitamin D", 10)).toBe("red");
    });
  });

  describe("Vitamin B12", () => {
    it("flags 500 as green", () => {
      expect(flagBiomarker("Vitamin B12", 500)).toBe("green");
    });
    it("flags 160 as yellow", () => {
      expect(flagBiomarker("Vitamin B12", 160)).toBe("yellow");
    });
    it("flags 100 as red", () => {
      expect(flagBiomarker("Vitamin B12", 100)).toBe("red");
    });
  });

  describe("Iron (gender-specific)", () => {
    it("flags male 100 as green", () => {
      expect(flagBiomarker("Iron", 100, "male")).toBe("green");
    });
    it("flags female 100 as green", () => {
      expect(flagBiomarker("Iron", 100, "female")).toBe("green");
    });
    it("flags male 55 as yellow", () => {
      expect(flagBiomarker("Iron", 55, "male")).toBe("yellow");
    });
  });

  describe("Uric Acid (gender-specific)", () => {
    it("flags male 5.0 as green", () => {
      expect(flagBiomarker("Uric Acid", 5.0, "male")).toBe("green");
    });
    it("flags female 4.0 as green", () => {
      expect(flagBiomarker("Uric Acid", 4.0, "female")).toBe("green");
    });
    it("flags male 7.5 as yellow", () => {
      expect(flagBiomarker("Uric Acid", 7.5, "male")).toBe("yellow");
    });
    it("flags female 6.5 as yellow", () => {
      expect(flagBiomarker("Uric Acid", 6.5, "female")).toBe("yellow");
    });
  });

  // -------------------------------------------------------------------------
  // Fuzzy name matching
  // -------------------------------------------------------------------------

  describe("fuzzy name matching", () => {
    it("matches 'Fasting Glucose' to glucose range", () => {
      expect(flagBiomarker("Fasting Glucose", 126)).toBe("red");
    });
    it("matches 'fasting blood sugar' to glucose range", () => {
      expect(flagBiomarker("fasting blood sugar", 99)).toBe("green");
    });
    it("matches 'HbA1C' to A1C range", () => {
      expect(flagBiomarker("HbA1C", 5.6)).toBe("green");
    });
    it("matches 'Systolic BP' to blood pressure systolic", () => {
      expect(flagBiomarker("Systolic BP", 140)).toBe("red");
    });
    it("matches 'HDL-C' to HDL", () => {
      expect(flagBiomarker("HDL-C", 61, "male")).toBe("green");
    });
    it("matches 'LDL-C' to LDL", () => {
      expect(flagBiomarker("LDL-C", 130)).toBe("red");
    });
    it("matches 'hgb' to hemoglobin", () => {
      expect(flagBiomarker("hgb", 15.0, "male")).toBe("green");
    });
    it("matches 'Thyroid Stimulating Hormone' to TSH", () => {
      expect(flagBiomarker("Thyroid Stimulating Hormone", 2.0)).toBe("green");
    });
  });

  // -------------------------------------------------------------------------
  // Unknown biomarker fallback
  // -------------------------------------------------------------------------

  describe("unknown biomarker", () => {
    it("returns null for unrecognized biomarker", () => {
      expect(flagBiomarker("Mystery Marker XYZ", 42)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// applyServerSideFlags
// ---------------------------------------------------------------------------

describe("applyServerSideFlags", () => {
  it("overrides Claude's green flag with correct red flag", () => {
    const biomarkers = [
      { name: "Glucose", value: 126, unit: "mg/dL", flag: "green" as const, reference_low: null, reference_high: null },
    ];
    const result = applyServerSideFlags(biomarkers);
    expect(result[0].flag).toBe("red");
  });

  it("keeps Claude's flag for unknown biomarkers", () => {
    const biomarkers = [
      { name: "Unknown Marker", value: 42, unit: "units", flag: "green" as const, reference_low: null, reference_high: null },
    ];
    const result = applyServerSideFlags(biomarkers);
    expect(result[0].flag).toBe("green");
  });

  it("skips biomarkers with null value", () => {
    const biomarkers = [
      { name: "Glucose", value: null, unit: "mg/dL", flag: "green" as const, reference_low: null, reference_high: null },
    ];
    const result = applyServerSideFlags(biomarkers);
    expect(result[0].flag).toBe("green");
  });

  it("correctly flags multiple biomarkers in one pass", () => {
    const biomarkers = [
      { name: "Glucose", value: 126, unit: "mg/dL", flag: "green" as const, reference_low: null, reference_high: null },
      { name: "Blood Pressure Systolic", value: 190, unit: "mmHg", flag: "green" as const, reference_low: null, reference_high: null },
      { name: "Total Cholesterol", value: 180, unit: "mg/dL", flag: "green" as const, reference_low: null, reference_high: null },
    ];
    const result = applyServerSideFlags(biomarkers);
    expect(result[0].flag).toBe("red");  // Glucose 126 = red
    expect(result[1].flag).toBe("red");  // BP 190 = red
    expect(result[2].flag).toBe("green"); // Chol 180 = green
  });
});

// ---------------------------------------------------------------------------
// Calculated metrics
// ---------------------------------------------------------------------------

describe("calculateBMI", () => {
  it("classifies normal BMI as green", () => {
    // 70kg, 170cm = ~24.2
    const result = calculateBMI(70, 170);
    expect(result.flag).toBe("green");
    expect(result.value).toBeCloseTo(24.2, 0);
  });

  it("classifies underweight BMI as yellow", () => {
    // 45kg, 170cm = ~15.6
    const result = calculateBMI(45, 170);
    expect(result.flag).toBe("yellow");
  });

  it("classifies overweight BMI as yellow", () => {
    // 85kg, 170cm = ~29.4
    const result = calculateBMI(85, 170);
    expect(result.flag).toBe("yellow");
  });

  it("classifies obese BMI as red", () => {
    // 100kg, 170cm = ~34.6
    const result = calculateBMI(100, 170);
    expect(result.flag).toBe("red");
  });

  it("returns correct unit", () => {
    const result = calculateBMI(70, 170);
    expect(result.unit).toBe("kg/m2");
    expect(result.name).toBe("BMI");
  });
});

describe("calculateCholesterolHDLRatio", () => {
  it("classifies ratio < 5.0 as green", () => {
    const result = calculateCholesterolHDLRatio(180, 60); // 3.0
    expect(result.flag).toBe("green");
    expect(result.value).toBe(3.0);
  });

  it("classifies ratio 5.0-5.9 as yellow", () => {
    const result = calculateCholesterolHDLRatio(250, 45); // ~5.6
    expect(result.flag).toBe("yellow");
  });

  it("classifies ratio >= 6.0 as red", () => {
    const result = calculateCholesterolHDLRatio(300, 40); // 7.5
    expect(result.flag).toBe("red");
  });

  it("handles HDL of 0 as red", () => {
    const result = calculateCholesterolHDLRatio(200, 0);
    expect(result.flag).toBe("red");
  });
});

describe("calculateWaistHeightRatio", () => {
  it("classifies ratio < 0.5 as green", () => {
    const result = calculateWaistHeightRatio(80, 180); // ~0.44
    expect(result.flag).toBe("green");
  });

  it("classifies ratio 0.5-0.6 as yellow", () => {
    const result = calculateWaistHeightRatio(95, 175); // ~0.54
    expect(result.flag).toBe("yellow");
  });

  it("classifies ratio > 0.6 as red", () => {
    const result = calculateWaistHeightRatio(115, 170); // ~0.68
    expect(result.flag).toBe("red");
  });

  it("handles height of 0 as red", () => {
    const result = calculateWaistHeightRatio(80, 0);
    expect(result.flag).toBe("red");
  });
});
