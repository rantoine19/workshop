/**
 * Health score calculation from biomarker risk flags.
 *
 * Computes a single 0-100 score summarizing overall health based on
 * the distribution of green/yellow/red biomarker flags. Critical
 * biomarkers (blood pressure, glucose, A1C, cholesterol) are weighted
 * 2x to reflect their clinical significance.
 *
 * Implements #109 — Dashboard health score.
 */

export interface HealthScoreResult {
  score: number;          // 0-100
  label: string;          // "Excellent" | "Good" | "Fair" | "Needs Attention"
  color: string;          // "green" | "orange" | "red"
  breakdown: {
    green: number;        // count of green biomarkers
    yellow: number;       // count of yellow/orange biomarkers
    red: number;          // count of red biomarkers
    total: number;        // total biomarkers analyzed
  };
  topConcerns: string[];  // top 3 red/yellow biomarker names
}

/**
 * Biomarker names (lowercased substrings) that receive 2x weight
 * in the score calculation due to their clinical significance.
 */
const CRITICAL_BIOMARKERS = [
  "blood pressure",
  "systolic",
  "diastolic",
  "glucose",
  "a1c",
  "hba1c",
  "hemoglobin a1c",
  "total cholesterol",
  "ldl",
  "hdl",
];

/**
 * Check whether a biomarker name matches a critical biomarker pattern.
 */
function isCritical(name: string): boolean {
  const lower = name.toLowerCase();
  return CRITICAL_BIOMARKERS.some(
    (pattern) => lower.includes(pattern)
  );
}

/**
 * Map a flag color to its point value.
 */
function flagPoints(flag: "green" | "yellow" | "red"): number {
  switch (flag) {
    case "green":
      return 100;
    case "yellow":
      return 50;
    case "red":
      return 10;
  }
}

/**
 * Map a numeric score to its label and color.
 */
function scoreToLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Excellent", color: "green" };
  if (score >= 70) return { label: "Good", color: "green" };
  if (score >= 50) return { label: "Fair", color: "orange" };
  return { label: "Needs Attention", color: "red" };
}

/**
 * Calculate an overall health score from an array of biomarker flags.
 *
 * Scoring:
 * - Green = 100 pts, Yellow = 50 pts, Red = 10 pts
 * - Critical biomarkers (BP, glucose, A1C, cholesterol) get 2x weight
 * - Score = weighted average of all biomarker points
 *
 * Labels:
 * - 85-100: Excellent (green)
 * - 70-84: Good (green)
 * - 50-69: Fair (orange)
 * - 0-49: Needs Attention (red)
 */
export function calculateHealthScore(
  biomarkers: Array<{ name: string; flag: "green" | "yellow" | "red" }>
): HealthScoreResult {
  if (biomarkers.length === 0) {
    return {
      score: 0,
      label: "Needs Attention",
      color: "red",
      breakdown: { green: 0, yellow: 0, red: 0, total: 0 },
      topConcerns: [],
    };
  }

  let totalWeight = 0;
  let weightedPoints = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  // Collect non-green biomarkers for concerns list
  const concerns: Array<{ name: string; flag: "yellow" | "red" }> = [];

  for (const b of biomarkers) {
    const weight = isCritical(b.name) ? 2 : 1;
    const points = flagPoints(b.flag);

    totalWeight += weight;
    weightedPoints += points * weight;

    switch (b.flag) {
      case "green":
        greenCount++;
        break;
      case "yellow":
        yellowCount++;
        concerns.push({ name: b.name, flag: "yellow" });
        break;
      case "red":
        redCount++;
        concerns.push({ name: b.name, flag: "red" });
        break;
    }
  }

  // Weighted average, rounded to nearest integer
  const rawScore = totalWeight > 0 ? weightedPoints / totalWeight : 0;
  const score = Math.round(rawScore);

  const { label, color } = scoreToLabel(score);

  // Sort concerns: red first, then yellow; take top 3
  concerns.sort((a, b) => {
    if (a.flag === "red" && b.flag !== "red") return -1;
    if (a.flag !== "red" && b.flag === "red") return 1;
    return 0;
  });
  const topConcerns = concerns.slice(0, 3).map((c) => c.name);

  return {
    score,
    label,
    color,
    breakdown: {
      green: greenCount,
      yellow: yellowCount,
      red: redCount,
      total: biomarkers.length,
    },
    topConcerns,
  };
}
