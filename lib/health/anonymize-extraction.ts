/**
 * Anonymize parsed biomarker extractions for few-shot example storage (#135).
 *
 * Removes all PHI (actual patient values) and replaces them with
 * representative placeholder values within normal range. Keeps biomarker
 * names, units, reference ranges, and structure so examples demonstrate
 * the expected output format without exposing real patient data.
 */

export interface RawBiomarker {
  name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: string;
  confidence?: number;
}

export interface AnonymizedExtraction {
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    reference_low: number | null;
    reference_high: number | null;
    flag: string;
  }>;
  summary: string;
}

/**
 * Generate a representative placeholder value within normal range.
 *
 * Strategy:
 * - If both reference bounds exist, use the midpoint.
 * - If only high exists, use 75% of the high bound.
 * - If only low exists, use 125% of the low bound.
 * - If neither exists, use a rounded value based on the original
 *   (rounded to remove precision that could identify a patient).
 */
function generatePlaceholderValue(
  referenceLow: number | null,
  referenceHigh: number | null,
  originalValue: number
): number {
  if (referenceLow != null && referenceHigh != null) {
    // Midpoint of normal range
    const mid = (referenceLow + referenceHigh) / 2;
    return Math.round(mid * 10) / 10;
  }
  if (referenceHigh != null) {
    // 75% of upper bound (safely within range)
    return Math.round(referenceHigh * 0.75 * 10) / 10;
  }
  if (referenceLow != null) {
    // 125% of lower bound (safely above minimum)
    return Math.round(referenceLow * 1.25 * 10) / 10;
  }
  // No reference range — round the original value to remove identifying precision
  if (Math.abs(originalValue) >= 100) {
    return Math.round(originalValue / 10) * 10;
  }
  if (Math.abs(originalValue) >= 10) {
    return Math.round(originalValue);
  }
  return Math.round(originalValue * 10) / 10;
}

/**
 * Generate a generic summary from the biomarker list.
 *
 * Does NOT use the original summary (which might contain patient-specific
 * language). Instead, builds a structure-only description.
 */
function generateAnonymizedSummary(biomarkers: RawBiomarker[]): string {
  const categories = new Set<string>();

  for (const b of biomarkers) {
    const lower = b.name.toLowerCase();
    if (
      lower.includes("cholesterol") ||
      lower.includes("ldl") ||
      lower.includes("hdl") ||
      lower.includes("triglyceride")
    ) {
      categories.add("lipid panel");
    } else if (
      lower.includes("glucose") ||
      lower.includes("a1c") ||
      lower.includes("hemoglobin a1c")
    ) {
      categories.add("glucose/diabetes markers");
    } else if (
      lower.includes("creatinine") ||
      lower.includes("bun") ||
      lower.includes("gfr") ||
      lower.includes("sodium") ||
      lower.includes("potassium") ||
      lower.includes("chloride") ||
      lower.includes("calcium") ||
      lower.includes("albumin") ||
      lower.includes("bilirubin") ||
      lower.includes("protein")
    ) {
      categories.add("metabolic panel");
    } else if (
      lower.includes("wbc") ||
      lower.includes("rbc") ||
      lower.includes("hemoglobin") ||
      lower.includes("hematocrit") ||
      lower.includes("platelet") ||
      lower.includes("mcv") ||
      lower.includes("mch")
    ) {
      categories.add("CBC");
    } else if (
      lower.includes("tsh") ||
      lower.includes("t3") ||
      lower.includes("t4") ||
      lower.includes("thyroid")
    ) {
      categories.add("thyroid panel");
    } else if (
      lower.includes("alt") ||
      lower.includes("ast") ||
      lower.includes("alkaline phosphatase") ||
      lower.includes("ggt")
    ) {
      categories.add("liver function");
    }
  }

  if (categories.size === 0) {
    return `Lab report containing ${biomarkers.length} biomarker results.`;
  }

  const categoryList = Array.from(categories).join(", ");
  return `Lab report containing ${categoryList} results.`;
}

/**
 * Anonymize a parsed biomarker extraction for storage as a few-shot example.
 *
 * - Keeps: biomarker names, units, reference ranges, structure, order
 * - Replaces: actual values with representative placeholders within normal range
 * - Removes: confidence scores (not relevant for examples), any PHI
 * - Sets: all flags to "green" (placeholder values are within normal range)
 */
export function anonymizeExtraction(
  biomarkers: RawBiomarker[]
): AnonymizedExtraction {
  const anonymizedBiomarkers = biomarkers.map((b) => ({
    name: b.name,
    value: generatePlaceholderValue(b.reference_low, b.reference_high, b.value),
    unit: b.unit,
    reference_low: b.reference_low,
    reference_high: b.reference_high,
    flag: "green" as const,
  }));

  return {
    biomarkers: anonymizedBiomarkers,
    summary: generateAnonymizedSummary(biomarkers),
  };
}
