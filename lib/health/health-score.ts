/**
 * Health Credit Score calculation from biomarker risk flags.
 *
 * Uses a 300-850 scale modeled after US credit scores to make
 * health status instantly relatable. Critical biomarkers (blood
 * pressure, glucose, A1C, cholesterol) are weighted 2x.
 *
 * Score ranges:
 *   800-850  Excellent       (bright green)
 *   740-799  Very Good       (green)
 *   670-739  Active            (light green)
 *   580-669  Fair (orange)
 *   300-579  Poor (red)
 */

export interface HealthScoreResult {
  score: number;          // 300-850
  label: string;          // "Excellent" | "Very Good" | "Active" | "Fair" | "Poor"
  color: string;          // CSS color class key
  breakdown: {
    green: number;        // count of green biomarkers
    yellow: number;       // count of yellow/orange biomarkers
    red: number;          // count of red biomarkers
    total: number;        // total biomarkers analyzed
  };
  topConcerns: string[];  // top 3 red/yellow biomarker names
  tips: string[];         // 2-3 actionable improvement tips
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
 * The maximum bonus points above the base score of 300.
 * 850 - 300 = 550
 */
const SCORE_BASE = 300;
const SCORE_RANGE = 550;

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
 * Map a flag color to its fraction of full credit.
 */
function flagCredit(flag: "green" | "yellow" | "red"): number {
  switch (flag) {
    case "green":
      return 1;    // full credit
    case "yellow":
      return 0.5;  // half credit
    case "red":
      return 0;    // no credit
  }
}

/**
 * Map a numeric 300-850 score to its label and color.
 */
function scoreToLabel(score: number): { label: string; color: string } {
  if (score >= 800) return { label: "Excellent", color: "excellent" };
  if (score >= 740) return { label: "Very Good", color: "very-good" };
  if (score >= 670) return { label: "Good", color: "good" };
  if (score >= 580) return { label: "Fair", color: "fair" };
  return { label: "Poor", color: "poor" };
}

/**
 * Estimate how many points a biomarker improvement would yield,
 * used for generating actionable tips.
 */
function estimatePointGain(
  totalWeight: number,
  biomarkerWeight: number,
  currentFlag: "yellow" | "red"
): number {
  // Moving from current flag to green
  const creditGain = currentFlag === "red" ? 1 : 0.5;
  const gain = Math.round((creditGain * biomarkerWeight * SCORE_RANGE) / totalWeight);
  return gain;
}

/**
 * Generate 2-3 improvement tips based on non-green biomarkers.
 */
function generateTips(
  concerns: Array<{ name: string; flag: "yellow" | "red"; weight: number }>,
  totalWeight: number
): string[] {
  const tips: string[] = [];

  // Sort by potential point gain (red critical first)
  const sorted = [...concerns].sort((a, b) => {
    const gainA = estimatePointGain(totalWeight, a.weight, a.flag);
    const gainB = estimatePointGain(totalWeight, b.weight, b.flag);
    return gainB - gainA;
  });

  for (const c of sorted.slice(0, 3)) {
    const gain = estimatePointGain(totalWeight, c.weight, c.flag);
    if (gain > 0) {
      tips.push(`Improve your ${c.name} to gain ~${gain} points`);
    }
  }

  return tips;
}

/**
 * Calculate a Health Credit Score from an array of biomarker flags.
 *
 * Algorithm:
 * - Base score: 300
 * - Each biomarker contributes weighted credit toward the 550-point range
 *   - Green: full credit (550 * weight / totalWeight)
 *   - Yellow: half credit (275 * weight / totalWeight)
 *   - Red: no credit (0)
 * - Critical biomarkers (BP, glucose, A1C, cholesterol) get 2x weight
 * - Result: 300 (all red) to 850 (all green)
 */
export function calculateHealthScore(
  biomarkers: Array<{ name: string; flag: "green" | "yellow" | "red" }>
): HealthScoreResult {
  if (biomarkers.length === 0) {
    return {
      score: 300,
      label: "Poor",
      color: "poor",
      breakdown: { green: 0, yellow: 0, red: 0, total: 0 },
      topConcerns: [],
      tips: [],
    };
  }

  let totalWeight = 0;
  let weightedCredit = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  // Collect non-green biomarkers for concerns & tips
  const concerns: Array<{
    name: string;
    flag: "yellow" | "red";
    weight: number;
  }> = [];

  for (const b of biomarkers) {
    const weight = isCritical(b.name) ? 2 : 1;
    const credit = flagCredit(b.flag);

    totalWeight += weight;
    weightedCredit += credit * weight;

    switch (b.flag) {
      case "green":
        greenCount++;
        break;
      case "yellow":
        yellowCount++;
        concerns.push({ name: b.name, flag: "yellow", weight });
        break;
      case "red":
        redCount++;
        concerns.push({ name: b.name, flag: "red", weight });
        break;
    }
  }

  // Score = 300 + (weightedCredit / totalWeight) * 550
  const fraction = totalWeight > 0 ? weightedCredit / totalWeight : 0;
  const score = Math.round(SCORE_BASE + fraction * SCORE_RANGE);

  const { label, color } = scoreToLabel(score);

  // Sort concerns: red first, then yellow; take top 3
  concerns.sort((a, b) => {
    if (a.flag === "red" && b.flag !== "red") return -1;
    if (a.flag !== "red" && b.flag === "red") return 1;
    return 0;
  });
  const topConcerns = concerns.slice(0, 3).map((c) => c.name);

  // Generate improvement tips
  const tips = generateTips(concerns, totalWeight);

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
    tips,
  };
}
