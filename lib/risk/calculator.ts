export type RiskFlag = "green" | "yellow" | "red";

export interface RiskCalculationInput {
  name: string;
  value: number;
  reference_low: number | null;
  reference_high: number | null;
}

export interface RiskCalculationResult {
  biomarker_name: string;
  value: number;
  reference_low: number | null;
  reference_high: number | null;
  flag: RiskFlag;
}

/**
 * Calculates a deterministic risk flag for a biomarker value.
 *
 * - Green: value is within the reference range
 * - Yellow: value is within 10% outside the reference range boundary
 * - Red: value is more than 10% outside the reference range
 *
 * If no reference range is provided, defaults to green.
 */
export function calculateRiskFlag(
  value: number,
  referenceLow: number | null,
  referenceHigh: number | null
): RiskFlag {
  // No reference range — cannot assess risk
  if (referenceLow == null && referenceHigh == null) {
    return "green";
  }

  // Only low bound available
  if (referenceLow != null && referenceHigh == null) {
    if (value >= referenceLow) {
      return "green";
    }
    const threshold = referenceLow * 0.1;
    if (value >= referenceLow - threshold) {
      return "yellow";
    }
    return "red";
  }

  // Only high bound available
  if (referenceLow == null && referenceHigh != null) {
    if (value <= referenceHigh) {
      return "green";
    }
    const threshold = referenceHigh * 0.1;
    if (value <= referenceHigh + threshold) {
      return "yellow";
    }
    return "red";
  }

  // Both bounds available
  const low = referenceLow!;
  const high = referenceHigh!;

  if (value >= low && value <= high) {
    return "green";
  }

  // Check below low bound
  if (value < low) {
    const threshold = low * 0.1;
    if (value >= low - threshold) {
      return "yellow";
    }
    return "red";
  }

  // Check above high bound
  const threshold = high * 0.1;
  if (value <= high + threshold) {
    return "yellow";
  }
  return "red";
}

/**
 * Calculates risk flags for an array of biomarkers.
 */
export function calculateRiskFlags(
  biomarkers: RiskCalculationInput[]
): RiskCalculationResult[] {
  return biomarkers.map((b) => ({
    biomarker_name: b.name,
    value: b.value,
    reference_low: b.reference_low,
    reference_high: b.reference_high,
    flag: calculateRiskFlag(b.value, b.reference_low, b.reference_high),
  }));
}
