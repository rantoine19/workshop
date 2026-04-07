/**
 * Trend calculation for biomarker comparison.
 *
 * Uses reference range direction metadata to determine whether a change
 * between two values is improving, worsening, or stable.
 */

import {
  REFERENCE_RANGES,
  type ReferenceRange,
} from "./reference-ranges";

export type TrendDirection = "improving" | "worsening" | "stable";

/** Threshold below which a percentage change is considered "stable". */
const STABLE_THRESHOLD = 0.02; // 2%

/**
 * Normalize a biomarker name for matching (mirrors flag-biomarker.ts logic).
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
 * Find the best matching reference range for a biomarker name.
 */
export function findRangeForTrend(
  name: string,
): ReferenceRange | null {
  const normalized = normalizeName(name);

  let bestScore = 0;
  let bestCandidate: ReferenceRange | null = null;

  for (const range of REFERENCE_RANGES) {
    for (const alias of range.aliases) {
      const normalizedAlias = normalizeName(alias);
      let score = 0;
      if (normalized === normalizedAlias) {
        score = 100;
      } else if (normalizedAlias.length >= 3 && normalized.includes(normalizedAlias)) {
        score = 50 + normalizedAlias.length;
      } else if (normalized.length >= 3 && normalizedAlias.includes(normalized)) {
        score = 50 + normalized.length;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = range;
      }
    }
  }

  // Prefer ungendered range
  if (bestCandidate && bestCandidate.gender) {
    const ungenderedMatch = REFERENCE_RANGES.find(
      (r) =>
        r.name === bestCandidate!.name && !r.gender
    );
    if (ungenderedMatch) return ungenderedMatch;
  }

  return bestCandidate;
}

/**
 * Calculate the trend between the oldest and newest value of a biomarker,
 * given the reference range direction.
 *
 * @param oldValue - The earlier (older) value
 * @param newValue - The later (newer) value
 * @param direction - How to interpret changes
 * @param greenRange - The green (optimal) range for "range" direction biomarkers
 */
export function calculateTrend(
  oldValue: number,
  newValue: number,
  direction: ReferenceRange["direction"],
  greenRange?: { low: number | null; high: number | null },
): TrendDirection {
  // Check for stability first
  const avg = (Math.abs(oldValue) + Math.abs(newValue)) / 2;
  if (avg === 0) return "stable";
  const pctChange = Math.abs(newValue - oldValue) / avg;
  if (pctChange < STABLE_THRESHOLD) return "stable";

  const diff = newValue - oldValue;

  switch (direction) {
    case "lower-is-better":
      // Decreasing value is improving
      return diff < 0 ? "improving" : "worsening";

    case "higher-is-better":
      // Increasing value is improving
      return diff > 0 ? "improving" : "worsening";

    case "range": {
      // Value moving closer to the green range midpoint is improving
      if (!greenRange || greenRange.low === null || greenRange.high === null) {
        return "stable";
      }
      const mid = (greenRange.low + greenRange.high) / 2;
      const oldDist = Math.abs(oldValue - mid);
      const newDist = Math.abs(newValue - mid);

      if (Math.abs(oldDist - newDist) / Math.max(oldDist, newDist, 1) < STABLE_THRESHOLD) {
        return "stable";
      }
      return newDist < oldDist ? "improving" : "worsening";
    }

    default:
      return "stable";
  }
}

/**
 * Calculate trend for a named biomarker using reference range lookup.
 */
export function calculateBiomarkerTrend(
  name: string,
  oldValue: number,
  newValue: number,
): TrendDirection {
  const range = findRangeForTrend(name);
  if (!range) return "stable";

  return calculateTrend(
    oldValue,
    newValue,
    range.direction,
    range.ranges.green,
  );
}
