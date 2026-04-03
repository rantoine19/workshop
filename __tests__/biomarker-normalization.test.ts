import { describe, it, expect } from "vitest";
import {
  normalizeBiomarkerName,
  normalizeUnit,
} from "@/lib/health/normalize-biomarker";
import { BIOMARKER_MAPPINGS, SYNONYM_INDEX } from "@/lib/health/biomarker-synonyms";

// ── Synonym Map Integrity ──────────────────────────────────────────

describe("Biomarker Synonym Map", () => {
  it("covers at least 50 biomarker synonym entries", () => {
    expect(SYNONYM_INDEX.size).toBeGreaterThanOrEqual(50);
  });

  it("has no duplicate synonyms across different canonical names", () => {
    const seen = new Map<string, string>();
    for (const mapping of BIOMARKER_MAPPINGS) {
      for (const synonym of mapping.synonyms) {
        const lower = synonym.toLowerCase();
        const existing = seen.get(lower);
        if (existing && existing !== mapping.canonical) {
          throw new Error(
            `Duplicate synonym "${lower}" found in both "${existing}" and "${mapping.canonical}"`
          );
        }
        seen.set(lower, mapping.canonical);
      }
    }
  });

  it("all synonyms are lowercase", () => {
    for (const mapping of BIOMARKER_MAPPINGS) {
      for (const synonym of mapping.synonyms) {
        expect(synonym).toBe(synonym.toLowerCase());
      }
    }
  });

  it("every mapping has a canonical name, category, and unit", () => {
    for (const mapping of BIOMARKER_MAPPINGS) {
      expect(mapping.canonical).toBeTruthy();
      expect(mapping.category).toBeTruthy();
      expect(mapping.unit).toBeTruthy();
    }
  });
});

// ── Name Normalization ─────────────────────────────────────────────

describe("normalizeBiomarkerName", () => {
  // --- Lipid Panel ---
  describe("Lipid Panel", () => {
    it.each([
      ["Total Cholesterol", "Total Cholesterol"],
      ["Chol", "Total Cholesterol"],
      ["TC", "Total Cholesterol"],
      ["Cholesterol, Total", "Total Cholesterol"],
      ["cholesterol total", "Total Cholesterol"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });

    it.each([
      ["LDL", "LDL Cholesterol"],
      ["ldl-c", "LDL Cholesterol"],
      ["Low Density Lipoprotein", "LDL Cholesterol"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });

    it.each([
      ["HDL", "HDL Cholesterol"],
      ["hdl-c", "HDL Cholesterol"],
      ["High Density Lipoprotein", "HDL Cholesterol"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });

    it.each([
      ["Triglycerides", "Triglycerides"],
      ["TG", "Triglycerides"],
      ["Trigs", "Triglycerides"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });

    it('maps "VLDL" to "VLDL Cholesterol"', () => {
      expect(normalizeBiomarkerName("VLDL").canonical).toBe("VLDL Cholesterol");
    });
  });

  // --- Metabolic ---
  describe("Metabolic", () => {
    it.each([
      ["Glu", "Glucose (Fasting)"],
      ["Glucose", "Glucose (Fasting)"],
      ["FBS", "Glucose (Fasting)"],
      ["Fasting Blood Sugar", "Glucose (Fasting)"],
      ["Blood Sugar", "Glucose (Fasting)"],
      ["GLUCOSE", "Glucose (Fasting)"],
      ["Fasting Blood Glucose", "Glucose (Fasting)"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });

    it.each([
      ["HbA1c", "Hemoglobin A1C"],
      ["A1C", "Hemoglobin A1C"],
      ["Hemoglobin A1c", "Hemoglobin A1C"],
      ["Glycated Hemoglobin", "Hemoglobin A1C"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });

    it.each([
      ["BUN", "BUN"],
      ["Blood Urea Nitrogen", "BUN"],
      ["Creatinine", "Creatinine"],
      ["Creat", "Creatinine"],
      ["eGFR", "eGFR"],
      ["Estimated GFR", "eGFR"],
      ["Uric Acid", "Uric Acid"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Electrolytes ---
  describe("Electrolytes", () => {
    it.each([
      ["Sodium", "Sodium"],
      ["Na", "Sodium"],
      ["Na+", "Sodium"],
      ["Potassium", "Potassium"],
      ["K", "Potassium"],
      ["K+", "Potassium"],
      ["Chloride", "Chloride"],
      ["Cl", "Chloride"],
      ["CO2", "CO2/Bicarbonate"],
      ["Bicarbonate", "CO2/Bicarbonate"],
      ["HCO3", "CO2/Bicarbonate"],
      ["Calcium", "Calcium"],
      ["Ca", "Calcium"],
      ["Magnesium", "Magnesium"],
      ["Phosphorus", "Phosphorus"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Liver ---
  describe("Liver", () => {
    it.each([
      ["ALT", "ALT"],
      ["SGPT", "ALT"],
      ["Alanine Aminotransferase", "ALT"],
      ["AST", "AST"],
      ["SGOT", "AST"],
      ["Alkaline Phosphatase", "Alkaline Phosphatase"],
      ["ALP", "Alkaline Phosphatase"],
      ["Bilirubin", "Bilirubin Total"],
      ["Total Bilirubin", "Bilirubin Total"],
      ["Bilirubin Direct", "Bilirubin Direct"],
      ["Direct Bilirubin", "Bilirubin Direct"],
      ["Albumin", "Albumin"],
      ["Total Protein", "Total Protein"],
      ["GGT", "GGT"],
      ["Gamma-Glutamyl Transferase", "GGT"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- CBC ---
  describe("CBC", () => {
    it.each([
      ["WBC", "White Blood Cell Count"],
      ["White Blood Cells", "White Blood Cell Count"],
      ["Leukocytes", "White Blood Cell Count"],
      ["RBC", "Red Blood Cell Count"],
      ["Red Blood Cells", "Red Blood Cell Count"],
      ["Hemoglobin", "Hemoglobin"],
      ["Hgb", "Hemoglobin"],
      ["Hb", "Hemoglobin"],
      ["Hematocrit", "Hematocrit"],
      ["HCT", "Hematocrit"],
      ["Platelets", "Platelet Count"],
      ["PLT", "Platelet Count"],
      ["MCV", "MCV"],
      ["Mean Corpuscular Volume", "MCV"],
      ["MCH", "MCH"],
      ["MCHC", "MCHC"],
      ["RDW", "RDW"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Thyroid ---
  describe("Thyroid", () => {
    it.each([
      ["TSH", "TSH"],
      ["Thyroid Stimulating Hormone", "TSH"],
      ["Free T3", "Free T3"],
      ["FT3", "Free T3"],
      ["Free T4", "Free T4"],
      ["FT4", "Free T4"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Vitamins ---
  describe("Vitamins & Minerals", () => {
    it.each([
      ["Vitamin D", "Vitamin D"],
      ["25-Hydroxyvitamin D", "Vitamin D"],
      ["Vitamin B12", "Vitamin B12"],
      ["B12", "Vitamin B12"],
      ["Cobalamin", "Vitamin B12"],
      ["Folate", "Folate"],
      ["Folic Acid", "Folate"],
      ["Iron", "Iron"],
      ["Serum Iron", "Iron"],
      ["Fe", "Iron"],
      ["Ferritin", "Ferritin"],
      ["TIBC", "TIBC"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Cardiovascular ---
  describe("Cardiovascular", () => {
    it.each([
      ["Systolic", "Blood Pressure Systolic"],
      ["SBP", "Blood Pressure Systolic"],
      ["Diastolic", "Blood Pressure Diastolic"],
      ["DBP", "Blood Pressure Diastolic"],
      ["Heart Rate", "Resting Heart Rate"],
      ["Pulse", "Resting Heart Rate"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Body ---
  describe("Body Measurements", () => {
    it.each([
      ["BMI", "BMI"],
      ["Body Mass Index", "BMI"],
      ["Weight", "Weight"],
      ["Height", "Height"],
    ])('maps "%s" to "%s"', (input, expected) => {
      expect(normalizeBiomarkerName(input).canonical).toBe(expected);
    });
  });

  // --- Case insensitivity ---
  describe("Case insensitivity", () => {
    it("handles uppercase input", () => {
      expect(normalizeBiomarkerName("GLUCOSE").canonical).toBe("Glucose (Fasting)");
    });

    it("handles mixed case input", () => {
      expect(normalizeBiomarkerName("hDl ChOlEsTeRoL").canonical).toBe("HDL Cholesterol");
    });

    it("handles all lowercase input", () => {
      expect(normalizeBiomarkerName("hemoglobin a1c").canonical).toBe("Hemoglobin A1C");
    });
  });

  // --- Prefix/suffix stripping ---
  describe("Prefix/suffix stripping", () => {
    it('strips "Serum" prefix', () => {
      expect(normalizeBiomarkerName("Serum Glucose").canonical).toBe("Glucose (Fasting)");
    });

    it('strips "Blood" prefix', () => {
      expect(normalizeBiomarkerName("Blood Creatinine").canonical).toBe("Creatinine");
    });

    it('strips "Level" suffix', () => {
      expect(normalizeBiomarkerName("Glucose Level").canonical).toBe("Glucose (Fasting)");
    });

    it('strips "Test" suffix', () => {
      expect(normalizeBiomarkerName("TSH Test").canonical).toBe("TSH");
    });
  });

  // --- Unknown biomarkers ---
  describe("Unknown biomarkers", () => {
    it("returns original name for unknown biomarkers", () => {
      const result = normalizeBiomarkerName("Mystery Substance X");
      expect(result.canonical).toBe("Mystery Substance X");
      expect(result.matched).toBe(false);
      expect(result.category).toBe("Unknown");
    });

    it("handles empty string", () => {
      const result = normalizeBiomarkerName("");
      expect(result.canonical).toBe("");
      expect(result.matched).toBe(false);
    });

    it("handles whitespace-only input", () => {
      const result = normalizeBiomarkerName("   ");
      expect(result.matched).toBe(false);
    });
  });

  // --- Category assignment ---
  describe("Category assignment", () => {
    it("assigns Lipid Panel category", () => {
      expect(normalizeBiomarkerName("LDL").category).toBe("Lipid Panel");
    });

    it("assigns Metabolic category", () => {
      expect(normalizeBiomarkerName("Glucose").category).toBe("Metabolic");
    });

    it("assigns CBC category", () => {
      expect(normalizeBiomarkerName("WBC").category).toBe("CBC");
    });

    it("assigns Liver category", () => {
      expect(normalizeBiomarkerName("ALT").category).toBe("Liver");
    });

    it("assigns Thyroid category", () => {
      expect(normalizeBiomarkerName("TSH").category).toBe("Thyroid");
    });
  });

  // --- Word order variants ---
  describe("Word order variants", () => {
    it('handles "Cholesterol, Total" -> "Total Cholesterol"', () => {
      expect(normalizeBiomarkerName("Cholesterol, Total").canonical).toBe(
        "Total Cholesterol"
      );
    });

    it('handles "Bilirubin, Direct" -> "Bilirubin Direct"', () => {
      // "direct bilirubin" is a known synonym
      expect(normalizeBiomarkerName("Bilirubin, Direct").canonical).toBe(
        "Bilirubin Direct"
      );
    });
  });
});

// ── Unit Normalization ─────────────────────────────────────────────

describe("normalizeUnit", () => {
  it("converts glucose from mmol/L to mg/dL", () => {
    const result = normalizeUnit(5.5, "mmol/L", "Glucose (Fasting)");
    expect(result.unit).toBe("mg/dL");
    expect(result.value).toBeCloseTo(99.1, 0);
  });

  it("converts cholesterol from mmol/L to mg/dL", () => {
    const result = normalizeUnit(5.0, "mmol/L", "Total Cholesterol");
    expect(result.unit).toBe("mg/dL");
    expect(result.value).toBeCloseTo(193.35, 0);
  });

  it("converts triglycerides from mmol/L to mg/dL", () => {
    const result = normalizeUnit(1.7, "mmol/L", "Triglycerides");
    expect(result.unit).toBe("mg/dL");
    expect(result.value).toBeCloseTo(150.57, 0);
  });

  it("converts creatinine from umol/L to mg/dL", () => {
    const result = normalizeUnit(88.4, "umol/L", "Creatinine");
    expect(result.unit).toBe("mg/dL");
    expect(result.value).toBeCloseTo(1.0, 0);
  });

  it("returns original when no conversion needed", () => {
    const result = normalizeUnit(100, "mg/dL", "Glucose (Fasting)");
    expect(result.unit).toBe("mg/dL");
    expect(result.value).toBe(100);
  });

  it("returns original for unknown biomarker", () => {
    const result = normalizeUnit(42, "widgets/L", "Mystery Marker");
    expect(result.unit).toBe("widgets/L");
    expect(result.value).toBe(42);
  });

  it("handles A1C IFCC to NGSP conversion", () => {
    // 48 mmol/mol should be approximately 6.5%
    const result = normalizeUnit(48, "mmol/mol", "Hemoglobin A1C");
    expect(result.unit).toBe("%");
    expect(result.value).toBeCloseTo(6.5, 0);
  });

  it("converts vitamin D from nmol/L to ng/mL", () => {
    const result = normalizeUnit(75, "nmol/L", "Vitamin D");
    expect(result.unit).toBe("ng/mL");
    expect(result.value).toBeCloseTo(30, 0);
  });
});
