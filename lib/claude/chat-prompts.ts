import {
  PERSONA_PREAMBLE,
  CHAT_DISCLAIMER,
  CONVERSATIONAL_STYLE,
} from "./persona";

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
