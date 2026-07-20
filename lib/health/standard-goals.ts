/**
 * Standard Health Goals — pre-defined targets users can activate.
 *
 * Implements #150. Goals are a fixed library rooted in AHA/ADA clinical
 * guidelines. Users activate goals but cannot define custom targets, which
 * keeps expectations medically grounded and progress calculations
 * deterministic.
 */

export type GoalDirection = "lower" | "higher";
export type GoalStatus = "active" | "achieved" | "paused";

export interface StandardGoal {
  /** Machine-readable id — persisted in the health_goals table */
  id: string;
  /** User-facing title shown on cards */
  title: string;
  /** One-line description shown below the title */
  description: string;
  /** Canonical biomarker name the goal tracks (matches reference-ranges.ts) */
  targetBiomarker: string;
  /** Value the biomarker must reach for the goal to be achieved */
  targetValue: number;
  /** Whether crossing the target means going lower or higher */
  direction: GoalDirection;
  /** Unit of measurement, shown alongside the value */
  unit: string;
  /** Optional secondary biomarker that also satisfies the goal (e.g. A1C) */
  alternateBiomarker?: string;
  alternateTarget?: number;
  alternateUnit?: string;
  /** Visual emoji shown on the card */
  emoji: string;
}

export const STANDARD_GOALS: StandardGoal[] = [
  {
    id: "lower_cholesterol",
    title: "Lower my cholesterol",
    description: "Get total cholesterol under 200 mg/dL",
    targetBiomarker: "Total Cholesterol",
    targetValue: 200,
    direction: "lower",
    unit: "mg/dL",
    emoji: "❤️",
  },
  {
    id: "control_blood_sugar",
    title: "Get my blood sugar under control",
    description: "Fasting glucose under 100 mg/dL or A1C under 5.7%",
    targetBiomarker: "Glucose (Fasting)",
    targetValue: 100,
    direction: "lower",
    unit: "mg/dL",
    alternateBiomarker: "Hemoglobin A1C",
    alternateTarget: 5.7,
    alternateUnit: "%",
    emoji: "🩸",
  },
  {
    id: "improve_blood_pressure",
    title: "Improve my blood pressure",
    description: "Systolic under 120 mmHg, diastolic under 80 mmHg",
    targetBiomarker: "Blood Pressure Systolic",
    targetValue: 120,
    direction: "lower",
    unit: "mmHg",
    alternateBiomarker: "Blood Pressure Diastolic",
    alternateTarget: 80,
    alternateUnit: "mmHg",
    emoji: "💓",
  },
  {
    id: "raise_hdl",
    title: "Raise my good cholesterol",
    description: "HDL cholesterol above 60 mg/dL",
    targetBiomarker: "HDL Cholesterol",
    targetValue: 60,
    direction: "higher",
    unit: "mg/dL",
    emoji: "💚",
  },
  {
    id: "lower_triglycerides",
    title: "Lower my triglycerides",
    description: "Triglycerides under 150 mg/dL",
    targetBiomarker: "Triglycerides",
    targetValue: 150,
    direction: "lower",
    unit: "mg/dL",
    emoji: "🫀",
  },
  {
    id: "boost_health_score",
    title: "Get my health score to Good",
    description: "Reach a Health Credit Score of 670+",
    targetBiomarker: "Health Score",
    targetValue: 670,
    direction: "higher",
    unit: "",
    emoji: "⭐",
  },
];

/**
 * Look up a standard goal by id. Returns null if the id is not recognised.
 */
export function getGoalById(id: string): StandardGoal | null {
  return STANDARD_GOALS.find((g) => g.id === id) ?? null;
}

/**
 * Compute progress toward a goal as a 0-100 percentage.
 *
 * For "lower" goals, we track how far the current value has moved from the
 * starting value down toward the target. For "higher" goals we track upward
 * progress. If there is no starting value (e.g. the goal was just activated),
 * we treat the user as either at 100% (already achieved) or 0%.
 *
 * The result is always clamped to [0, 100].
 */
export function calculateProgress(
  goal: StandardGoal,
  currentValue: number,
  startingValue: number | null
): number {
  if (Number.isNaN(currentValue) || currentValue === null) return 0;

  // If already at/past target, always 100%.
  if (isAchieved(goal, currentValue)) return 100;

  if (startingValue === null || Number.isNaN(startingValue)) {
    return 0;
  }

  let progress = 0;

  if (goal.direction === "lower") {
    // Need starting value strictly above the target; otherwise the goal was
    // already met at activation and any current value that hasn't been
    // achieved is a regression (clamp to 0).
    if (startingValue <= goal.targetValue) {
      return currentValue <= goal.targetValue ? 100 : 0;
    }
    const total = startingValue - goal.targetValue;
    const moved = startingValue - currentValue;
    progress = (moved / total) * 100;
  } else {
    // Higher direction — starting value must be below target.
    if (startingValue >= goal.targetValue) {
      return currentValue >= goal.targetValue ? 100 : 0;
    }
    const total = goal.targetValue - startingValue;
    const moved = currentValue - startingValue;
    progress = (moved / total) * 100;
  }

  if (!Number.isFinite(progress) || progress < 0) return 0;
  if (progress > 100) return 100;
  return Math.round(progress);
}

/**
 * True when the current biomarker value has crossed the goal's target.
 */
export function isAchieved(goal: StandardGoal, currentValue: number): boolean {
  if (Number.isNaN(currentValue) || currentValue === null) return false;
  if (goal.direction === "lower") return currentValue <= goal.targetValue;
  return currentValue >= goal.targetValue;
}
