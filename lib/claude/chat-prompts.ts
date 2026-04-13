import {
  PERSONA_PREAMBLE,
  CHAT_DISCLAIMER,
  CONVERSATIONAL_STYLE,
} from "./persona";
import { generateActionItems, type FlaggedBiomarker, type UserProfile } from "@/lib/health/action-items";
import { suggestRelatedTests } from "@/lib/health/related-tests";
import { getBiomarkerKnowledge } from "@/lib/health/biomarker-knowledge";

export const CHAT_SYSTEM_PROMPT = `${PERSONA_PREAMBLE}

${CONVERSATIONAL_STYLE}

CRITICAL RULES:
1. ALWAYS end your response with this exact disclaimer on its own line:

\u26a0\ufe0f ${CHAT_DISCLAIMER}

2. If the user asks for a diagnosis or treatment, politely redirect: "I can help you understand what the numbers mean, but for medical advice, please talk to your doctor."
3. If you don't have enough information to answer, say so honestly.
4. When explaining lab values, use everyday comparisons when possible (e.g., "Think of cholesterol like traffic in your blood vessels").

EXAMPLE GOOD RESPONSE (short, interactive):
"Your blood pressure reading is 190/140. Normal is usually around 120/80. Think of it like water pressure in a hose — yours is running pretty high right now.

This is something your doctor will definitely want to talk about soon. Want me to go over your cholesterol numbers next, or would you like tips on what to ask your doctor about blood pressure?

\u26a0\ufe0f ${CHAT_DISCLAIMER}"

EXAMPLE BAD RESPONSE (too long, not interactive):
Do NOT list all results in one message. Do NOT write more than a short paragraph. Do NOT skip the follow-up question.`;

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface StructuredMedication {
  name: string;
  dosage?: string | null;
  dosage_unit?: string | null;
  frequency: string;
}

const FREQUENCY_DISPLAY: Record<string, string> = {
  once_daily: "daily",
  twice_daily: "twice daily",
  three_times_daily: "3x daily",
  weekly: "weekly",
  as_needed: "as needed",
  other: "",
};

export function formatMedicationForContext(med: StructuredMedication): string {
  const parts = [med.name];
  if (med.dosage) {
    parts.push(med.dosage + (med.dosage_unit ? med.dosage_unit : ""));
  }
  const freq = FREQUENCY_DISPLAY[med.frequency] || med.frequency;
  if (freq) {
    parts.push(`(${freq})`);
  }
  return parts.join(" ");
}

export function buildHealthContext(
  profile: {
    gender?: string | null;
    date_of_birth?: string | null;
    height_inches?: number | null;
    known_conditions?: string[] | null;
    medications?: string | null;
    smoking_status?: string | null;
    family_history?: string[] | null;
    activity_level?: string | null;
    sleep_hours?: string | null;
  },
  structuredMedications?: StructuredMedication[]
): string {
  const parts: string[] = [];

  if (profile.gender) parts.push(`Gender: ${profile.gender}`);
  if (profile.date_of_birth) {
    const age = calculateAge(profile.date_of_birth);
    parts.push(`Age: ${age}`);
  }
  if (profile.height_inches) {
    const feet = Math.floor(profile.height_inches / 12);
    const inches = profile.height_inches % 12;
    parts.push(`Height: ${feet}'${inches}"`);
  }
  if (profile.known_conditions?.length) {
    parts.push(`Known conditions: ${profile.known_conditions.join(", ")}`);
  }

  // Prefer structured medications, fall back to free-text
  if (structuredMedications && structuredMedications.length > 0) {
    const medList = structuredMedications.map(formatMedicationForContext).join(", ");
    parts.push(`Active medications: ${medList}`);
  } else if (profile.medications) {
    parts.push(`Medications: ${profile.medications}`);
  }

  if (profile.smoking_status && profile.smoking_status !== "none") {
    parts.push(`Smoking: ${profile.smoking_status}`);
  }
  if (profile.family_history?.length) {
    parts.push(`Family history: ${profile.family_history.join(", ")}`);
  }
  if (profile.activity_level) {
    parts.push(`Activity: ${profile.activity_level}`);
  }
  if (profile.sleep_hours) {
    parts.push(`Sleep: ${profile.sleep_hours}`);
  }

  if (parts.length === 0) return "";

  return `Patient health profile:\n${parts.join("\n")}\n\nUse this information to personalize your responses. For example, if the patient has diabetes, pay extra attention to glucose and A1C values.`;
}

const MAX_MULTI_REPORT_CHARS = 12000; // ~3000 tokens

export interface MultiReportData {
  filename: string;
  report_date: string | null;
  created_at: string;
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    flag: string;
  }>;
  summary_plain: string;
}

/**
 * Builds combined context from multiple reports for date-aware chat.
 * Truncates if combined context exceeds token budget.
 */
export function buildMultiReportContext(reports: MultiReportData[]): string {
  if (reports.length === 0) return "";

  const sections: string[] = [];

  for (const report of reports) {
    const dateLabel = report.report_date
      ? report.report_date
      : `uploaded ${report.created_at.slice(0, 10)}`;

    const biomarkerList = report.biomarkers
      .map((b) => {
        const flag = b.flag !== "green" ? ` [${b.flag.toUpperCase()}]` : "";
        return `  - ${b.name}: ${b.value} ${b.unit}${flag}`;
      })
      .join("\n");

    sections.push(
      `--- Report: ${report.filename} (${dateLabel}) ---\nSummary: ${report.summary_plain}\nLab Results:\n${biomarkerList}`
    );
  }

  let combined = sections.join("\n\n");

  // Truncate if too long
  if (combined.length > MAX_MULTI_REPORT_CHARS) {
    combined = combined.slice(0, MAX_MULTI_REPORT_CHARS) + "\n[...truncated]";
  }

  return `Here are ALL of the patient's uploaded reports for context. Use the dates to track changes over time and provide date-aware insights.\n\n${combined}\n\nUse this data to answer the patient's questions. You can compare values across reports when relevant.`;
}

/**
 * Build biomarker knowledge context for flagged values.
 * Includes what affects each value, lifestyle tips, and food recommendations.
 */
export function buildBiomarkerKnowledgeContext(
  biomarkers: Array<{ name: string; flag: string }>
): string {
  const flagged = biomarkers.filter(
    (b) => b.flag === "yellow" || b.flag === "red"
  );

  if (flagged.length === 0) return "";

  const sections: string[] = [];

  for (const biomarker of flagged) {
    const knowledge = getBiomarkerKnowledge(biomarker.name);
    if (!knowledge) continue;

    const lines = [
      `${knowledge.name} (${biomarker.flag.toUpperCase()}):`,
      `  What it measures: ${knowledge.whatItMeasures}`,
      `  Why it matters: ${knowledge.whyItMatters}`,
      `  Common causes: ${knowledge.commonCausesHigh.slice(0, 3).join(", ")}`,
      `  Foods that help: ${knowledge.foodsThatHelp.slice(0, 4).join(", ")}`,
      `  Exercise: ${knowledge.exerciseRecommendation}`,
      `  When to worry: ${knowledge.whenToWorry}`,
    ];

    sections.push(lines.join("\n"));
  }

  if (sections.length === 0) return "";

  return `BIOMARKER KNOWLEDGE (use this to explain what affects each value):
${sections.join("\n\n")}`;
}

/**
 * Build enriched context combining biomarker knowledge, action items,
 * and related test suggestions for the chat system prompt.
 */
export function buildEnrichedContext(
  biomarkers: Array<{ name: string; value: number; unit?: string; flag: string }>,
  profile?: UserProfile | null
): string {
  const parts: string[] = [];

  // 1. Biomarker knowledge for flagged values
  const knowledgeCtx = buildBiomarkerKnowledgeContext(biomarkers);
  if (knowledgeCtx) parts.push(knowledgeCtx);

  // 2. Personalized action items
  const flaggedBiomarkers: FlaggedBiomarker[] = biomarkers
    .filter((b) => b.flag === "red" || b.flag === "yellow")
    .map((b) => ({
      name: b.name,
      value: b.value,
      unit: b.unit,
      flag: b.flag as "green" | "yellow" | "red",
    }));

  const actionCtx = generateActionItems(flaggedBiomarkers, profile);
  if (actionCtx) parts.push(actionCtx);

  // 3. Related test suggestions
  const testCtx = suggestRelatedTests(
    biomarkers.map((b) => ({
      name: b.name,
      flag: b.flag as "green" | "yellow" | "red",
    }))
  );
  if (testCtx) parts.push(testCtx);

  if (parts.length === 0) return "";

  return parts.join("\n\n") + "\n\n" + ENRICHED_CONTEXT_INSTRUCTIONS;
}

const ENRICHED_CONTEXT_INSTRUCTIONS = `ENRICHED CONTEXT INSTRUCTIONS:
- You have access to detailed biomarker knowledge above. Use it to explain what affects each value.
- Suggest specific lifestyle changes and foods based on the patient's results.
- When appropriate, mention related tests they could ask their doctor about.
- Give 2-3 specific actionable tips, not generic "talk to your doctor" advice.
- Still keep responses short (2-3 sentences) and end with a follow-up question.
- These suggestions are for general wellness. Always include the disclaimer.`;

export function buildReportContext(parsedResult: {
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    reference_low: number | null;
    reference_high: number | null;
    flag: string;
  }>;
  summary_plain: string;
}): string {
  const biomarkerList = parsedResult.biomarkers
    .map((b) => {
      const range =
        b.reference_low != null && b.reference_high != null
          ? ` (normal range: ${b.reference_low}-${b.reference_high} ${b.unit})`
          : "";
      const flag = b.flag !== "green" ? ` [${b.flag.toUpperCase()}]` : "";
      return `- ${b.name}: ${b.value} ${b.unit}${range}${flag}`;
    })
    .join("\n");

  return `Here is the patient's medical report data for context:

Summary: ${parsedResult.summary_plain}

Lab Results:
${biomarkerList}

Use this data to answer the patient's questions. Only reference values that are relevant to their question.`;
}
