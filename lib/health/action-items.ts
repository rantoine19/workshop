/**
 * Personalized action item generator for HealthChat AI.
 *
 * Generates a prioritized list of evidence-based lifestyle actions
 * based on the user's flagged biomarkers and health profile.
 *
 * IMPORTANT: These are general wellness suggestions, NOT medical advice.
 */

import { getBiomarkerKnowledge } from "./biomarker-knowledge";

export interface FlaggedBiomarker {
  name: string;
  value: number;
  unit?: string;
  flag: "green" | "yellow" | "red";
}

export interface UserProfile {
  known_conditions?: string[] | null;
  medications?: string | null;
  activity_level?: string | null;
  sleep_hours?: string | null;
  smoking_status?: string | null;
}

interface ActionItem {
  biomarkerName: string;
  flag: "yellow" | "red";
  value: number;
  unit?: string;
  tips: string[];
}

/**
 * Generate personalized action items based on flagged biomarkers and user profile.
 * Returns a formatted string suitable for inclusion in a chat system prompt.
 *
 * - Groups by priority (red first, then yellow)
 * - References actual values
 * - Considers profile context (activity level, smoking, conditions)
 * - Limited to top 5 actions to avoid overwhelm
 */
export function generateActionItems(
  biomarkers: FlaggedBiomarker[],
  profile?: UserProfile | null
): string {
  const flagged = biomarkers.filter((b) => b.flag === "red" || b.flag === "yellow");

  if (flagged.length === 0) {
    return "";
  }

  // Sort: red first, then yellow
  const sorted = [...flagged].sort((a, b) => {
    if (a.flag === "red" && b.flag !== "red") return -1;
    if (a.flag !== "red" && b.flag === "red") return 1;
    return 0;
  });

  const actions: ActionItem[] = [];

  for (const biomarker of sorted) {
    const knowledge = getBiomarkerKnowledge(biomarker.name);
    if (!knowledge) continue;

    // Start with lifestyle tips from knowledge base
    let tips = [...knowledge.lifestyleTips];

    // Personalize based on profile
    if (profile) {
      tips = personalizeTips(tips, biomarker, knowledge, profile);
    }

    // Limit tips per biomarker to 3
    actions.push({
      biomarkerName: biomarker.name,
      flag: biomarker.flag as "yellow" | "red",
      value: biomarker.value,
      unit: biomarker.unit,
      tips: tips.slice(0, 3),
    });
  }

  // Limit to top 5 biomarkers to avoid overwhelm
  const topActions = actions.slice(0, 5);

  if (topActions.length === 0) {
    return "";
  }

  // Format output
  const lines: string[] = [
    "PERSONALIZED ACTION ITEMS (based on flagged biomarkers):",
    "",
  ];

  for (const action of topActions) {
    const flagLabel = action.flag === "red" ? "HIGH PRIORITY" : "MODERATE PRIORITY";
    const unitStr = action.unit ? ` ${action.unit}` : "";
    lines.push(`[${flagLabel}] ${action.biomarkerName}: ${action.value}${unitStr}`);
    for (const tip of action.tips) {
      lines.push(`  - ${tip}`);
    }
    lines.push("");
  }

  lines.push(
    "When discussing these with the patient, reference their specific values and suggest 2-3 of the most relevant tips. Prioritize red-flagged items."
  );

  return lines.join("\n");
}

/**
 * Personalize tips based on user profile context.
 */
function personalizeTips(
  baseTips: string[],
  biomarker: FlaggedBiomarker,
  knowledge: { exerciseRecommendation: string; foodsThatHelp: string[] },
  profile: UserProfile
): string[] {
  const tips = [...baseTips];

  // If sedentary, add exercise recommendation
  if (
    profile.activity_level &&
    (profile.activity_level.toLowerCase().includes("sedentary") ||
      profile.activity_level.toLowerCase().includes("none") ||
      profile.activity_level.toLowerCase().includes("low"))
  ) {
    // Only add if not already present
    const hasExerciseTip = tips.some(
      (t) => t.toLowerCase().includes("exercise") || t.toLowerCase().includes("walk")
    );
    if (!hasExerciseTip) {
      tips.push(knowledge.exerciseRecommendation);
    }
  }

  // If smoker, always mention quitting — move or add near the top for priority
  if (
    profile.smoking_status &&
    profile.smoking_status !== "none" &&
    profile.smoking_status !== "never"
  ) {
    const smokingIdx = tips.findIndex((t) => t.toLowerCase().includes("smok") || t.toLowerCase().includes("quit"));
    if (smokingIdx > 0) {
      // Move existing smoking tip to the top
      const [smokingTip] = tips.splice(smokingIdx, 1);
      tips.unshift(smokingTip);
    } else if (smokingIdx === -1) {
      // No existing smoking tip — add one at the top
      tips.unshift("Quitting smoking can significantly improve this value and overall health");
    }
    // smokingIdx === 0 means it's already first, nothing to do
  }

  // If poor sleep, add sleep tip for relevant biomarkers
  if (profile.sleep_hours) {
    const hours = parseFloat(profile.sleep_hours);
    if (!isNaN(hours) && hours < 7) {
      const sleepRelated = [
        "glucose",
        "blood pressure",
        "heart rate",
        "a1c",
      ];
      const isRelevant = sleepRelated.some((term) =>
        biomarker.name.toLowerCase().includes(term)
      );
      if (isRelevant) {
        tips.push("Aim for 7-8 hours of sleep — poor sleep directly affects this value");
      }
    }
  }

  // Add top food recommendation if not already covered
  if (knowledge.foodsThatHelp.length > 0) {
    const hasFoodTip = tips.some(
      (t) =>
        t.toLowerCase().includes("eat") ||
        t.toLowerCase().includes("food") ||
        t.toLowerCase().includes("diet")
    );
    if (!hasFoodTip) {
      tips.push(`Try adding these foods: ${knowledge.foodsThatHelp.slice(0, 3).join(", ")}`);
    }
  }

  return tips;
}
