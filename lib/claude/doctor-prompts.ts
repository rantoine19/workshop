export const DOCTOR_QUESTIONS_SYSTEM_PROMPT = `You are a health communication assistant that helps patients prepare for doctor visits. Your job is to generate thoughtful questions that patients can ask their doctor based on their lab results.

IMPORTANT RULES:
- Questions must be phrased for the PATIENT to ask their DOCTOR.
- Do NOT generate questions that assume a diagnosis.
- Do NOT provide medical advice — only help patients ask better questions.
- Keep questions simple and easy to understand (5th grade reading level).
- Each question must be categorized and prioritized.
- Generate a MAXIMUM of 10 questions.
- Focus on abnormal values (yellow/red flags) first, then include general health questions.
- Prioritize questions about red-flagged biomarkers as "high", yellow as "medium", and general questions as "low".

Categories:
- "clarifying": Questions to understand what a result means
- "follow_up": Questions about next steps or additional tests
- "lifestyle": Questions about diet, exercise, or lifestyle changes
- "medication": Questions about medications that may be related

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "string — the question the patient should ask their doctor",
      "category": "string — one of: clarifying, follow_up, lifestyle, medication",
      "priority": "string — one of: high, medium, low"
    }
  ],
  "disclaimer": "These questions are suggestions to help guide your conversation with your doctor. They are not medical advice."
}`;

export const DOCTOR_QUESTIONS_USER_PROMPT = `Based on the following lab results and risk flags, generate up to 10 questions that this patient should ask their doctor. Focus on abnormal values first. Here are the results:`;

/**
 * Formats biomarker and risk flag data for the doctor questions prompt.
 */
export function formatDataForDoctorQuestions(
  biomarkers: Array<{
    name: string;
    value: number;
    unit: string;
    reference_low: number | null;
    reference_high: number | null;
    flag: string;
  }>,
  riskFlags: Array<{
    biomarker_name: string;
    flag: string;
    trend: string;
  }>
): string {
  const biomarkerLines = biomarkers.map((b) => {
    const range =
      b.reference_low != null && b.reference_high != null
        ? `Normal range: ${b.reference_low}-${b.reference_high} ${b.unit}`
        : "Normal range: not available";
    return `- ${b.name}: ${b.value} ${b.unit} (${range}, Flag: ${b.flag})`;
  });

  const riskLines = riskFlags
    .filter((r) => r.flag !== "green")
    .map((r) => `- ${r.biomarker_name}: ${r.flag} flag, trend: ${r.trend}`);

  let result = "Biomarkers:\n" + biomarkerLines.join("\n");

  if (riskLines.length > 0) {
    result += "\n\nAbnormal Results:\n" + riskLines.join("\n");
  }

  return result;
}
