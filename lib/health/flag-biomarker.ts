/**
 * Server-side biomarker flagging using deterministic reference ranges.
 *
 * Replaces Claude's advisory flag with a verified risk classification.
 * Fixes #87: Claude was marking everything green when lab reports
 * didn't include reference ranges.
 */

import { REFERENCE_RANGES, type RiskFlag, type ReferenceRange } from "./reference-ranges";

/**
 * Measurements that should NOT be flagged as risk indicators.
 * These are raw data points used for calculations (BMI, etc.)
 * but have no inherent "healthy" or "unhealthy" range on their own.
 */
const SKIP_FLAG_NAMES = [
  "height",
  "weight",
  "waist",
  "waist circumference",
  "hip",
  "hip circumference",
];

/**
 * Normalize a biomarker name for matching:
 * - lowercase
 * - strip parentheses content
 * - collapse whitespace
 * - trim
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9/\-+ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how well a normalized name matches a normalized alias.
 * Returns a score >= 0 (higher = better). Returns 0 if no match.
 */
function matchScore(normalized: string, normalizedAlias: string): number {
  // Exact match is best
  if (normalized === normalizedAlias) return 100;

  // Full alias appears as a word boundary in the name (e.g., "fasting glucose" contains "glucose")
  // Only match if the alias is at least 3 characters to avoid spurious short matches
  if (normalizedAlias.length >= 3 && normalized.includes(normalizedAlias)) {
    return 50 + normalizedAlias.length;
  }

  // Full name appears in the alias (e.g., "hdl" is contained in "hdl cholesterol")
  if (normalized.length >= 3 && normalizedAlias.includes(normalized)) {
    return 50 + normalized.length;
  }

  return 0;
}

/**
 * Find the best matching reference range for a biomarker name.
 * Uses scored matching to prefer more specific matches.
 * Returns matching ranges filtered by gender when provided.
 */
function findMatchingRange(
  name: string,
  gender?: "male" | "female"
): ReferenceRange | null {
  const normalized = normalizeName(name);

  // Score all ranges and pick the best match
  let bestScore = 0;
  let bestCandidates: ReferenceRange[] = [];

  for (const range of REFERENCE_RANGES) {
    let rangeScore = 0;
    for (const alias of range.aliases) {
      const score = matchScore(normalized, normalizeName(alias));
      rangeScore = Math.max(rangeScore, score);
    }
    if (rangeScore > 0) {
      if (rangeScore > bestScore) {
        bestScore = rangeScore;
        bestCandidates = [range];
      } else if (rangeScore === bestScore) {
        bestCandidates.push(range);
      }
    }
  }

  if (bestCandidates.length === 0) {
    return null;
  }

  // If gender is specified, prefer gender-specific range
  if (gender) {
    const genderMatch = bestCandidates.find((c) => c.gender === gender);
    if (genderMatch) return genderMatch;
  }

  // Fall back to ungendered range, or first candidate
  const ungenderedMatch = bestCandidates.find((c) => !c.gender);
  return ungenderedMatch ?? bestCandidates[0];
}

/**
 * Classify a value using a "range" direction reference range.
 * Green if within green band; yellow if within yellow band; red otherwise.
 */
function classifyRange(value: number, range: ReferenceRange): RiskFlag {
  const { green, yellow } = range.ranges;

  // Check green first
  if (
    green.low !== null &&
    green.high !== null &&
    value >= green.low &&
    value <= green.high
  ) {
    return "green";
  }

  // Check yellow band
  if (
    yellow.low !== null &&
    yellow.high !== null &&
    value >= yellow.low &&
    value <= yellow.high
  ) {
    return "yellow";
  }

  // Outside both bands = red
  return "red";
}

/**
 * Classify a value using a "lower-is-better" direction.
 * Value below green.high is green, within yellow range is yellow, else red.
 */
function classifyLowerIsBetter(value: number, range: ReferenceRange): RiskFlag {
  const { green, yellow } = range.ranges;

  if (green.high !== null && value <= green.high) {
    return "green";
  }
  if (
    yellow.low !== null &&
    yellow.high !== null &&
    value >= yellow.low &&
    value <= yellow.high
  ) {
    return "yellow";
  }
  return "red";
}

/**
 * Classify a value using a "higher-is-better" direction.
 * Value above green.low is green, within yellow range is yellow, else red.
 */
function classifyHigherIsBetter(value: number, range: ReferenceRange): RiskFlag {
  const { green, yellow } = range.ranges;

  if (green.low !== null && value >= green.low) {
    return "green";
  }
  if (
    yellow.low !== null &&
    yellow.high !== null &&
    value >= yellow.low &&
    value <= yellow.high
  ) {
    return "yellow";
  }
  return "red";
}

/**
 * Flag a biomarker value using server-side reference ranges.
 *
 * @param name - The biomarker name as extracted by Claude
 * @param value - The numeric value
 * @param gender - Optional patient gender for gender-specific ranges
 * @returns The risk flag color, or null if no matching range is found
 */
export function flagBiomarker(
  name: string,
  value: number,
  gender?: "male" | "female"
): RiskFlag | null {
  // Skip measurements that aren't risk indicators on their own
  const normalized = normalizeName(name);
  if (SKIP_FLAG_NAMES.some((skip) => normalized === skip)) {
    return "green";
  }

  const range = findMatchingRange(name, gender);

  if (!range) {
    return null;
  }

  switch (range.direction) {
    case "lower-is-better":
      return classifyLowerIsBetter(value, range);
    case "higher-is-better":
      return classifyHigherIsBetter(value, range);
    case "range":
      return classifyRange(value, range);
    default:
      return null;
  }
}

/**
 * Apply server-side flagging to an array of biomarkers parsed by Claude.
 * Overrides Claude's flag with a deterministic one when a reference range
 * is available; keeps Claude's flag as fallback when no range matches.
 */
export function applyServerSideFlags<
  T extends { name: string; value: number | null; flag: RiskFlag },
>(
  biomarkers: T[],
  gender?: "male" | "female"
): T[] {
  return biomarkers.map((b) => {
    if (b.value == null) return b;

    const serverFlag = flagBiomarker(b.name, b.value, gender);
    if (serverFlag) {
      return { ...b, flag: serverFlag };
    }
    // Keep Claude's flag as fallback for unrecognized biomarkers
    return b;
  });
}
