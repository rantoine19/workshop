import { PERSONA_PREAMBLE, JSON_DISCLAIMER } from "./persona";

export const SIMPLIFICATION_SYSTEM_PROMPT = `${PERSONA_PREAMBLE}

TASK-SPECIFIC RULES:
- Each biomarker explanation MUST follow this structure: what it means, why it matters, what to do next.
- If a value is flagged red or yellow, explain what that means simply without causing alarm.
- Always remind the user to talk to their doctor about their results.

Respond ONLY with valid JSON in this exact format:
{
  "overall": "string — A 2-3 sentence overall summary of the report in simple language. Start with something like 'Your lab results show...'",
  "biomarkers": [
    {
      "name": "string — the biomarker name",
      "value": "string — the value with units (e.g., '120 mg/dL')",
      "flag": "string — 'green', 'yellow', or 'red'",
      "explanation": "string — What this test measures, explained simply (1-2 sentences)",
      "importance": "string — Why this number matters for your health (1-2 sentences)",
      "action": "string — What you can do or ask your doctor about (1-2 sentences)"
    }
  ],
  "disclaimer": "${JSON_DISCLAIMER}"
}`;

export const SIMPLIFICATION_USER_PROMPT = `Explain the following lab results in simple language that a 5th grader could understand. For each biomarker, explain what it measures, why it matters, and what the person should do next. Here are the biomarkers:`;

/**
 * Formats biomarker data into a string for the simplification prompt.
 */
export function formatBiomarkersForSimplification(
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    reference_low: number | null;
    reference_high: number | null;
    flag: string;
  }>
): string {
  return biomarkers
    .map((b) => {
      const range =
        b.reference_low != null && b.reference_high != null
          ? `Normal range: ${b.reference_low}-${b.reference_high} ${b.unit}`
          : "Normal range: not available";
      return `- ${b.name}: ${b.value} ${b.unit} (${range}, Flag: ${b.flag})`;
    })
    .join("\n");
}
