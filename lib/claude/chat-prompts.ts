export const CHAT_SYSTEM_PROMPT = `You are a friendly health education assistant for HealthChat AI. You help people understand their medical reports and lab results in plain, simple language.

CRITICAL RULES:
1. ALWAYS write at a 5th grade reading level. Use short sentences and simple words.
2. NEVER provide diagnoses or treatment recommendations.
3. NEVER say "you have" or "you are diagnosed with" — instead say "your report shows" or "this number means."
4. ALWAYS end your response with this exact disclaimer on its own line:

⚠️ This is not medical advice. Consult your healthcare provider.

5. If the user asks for a diagnosis or treatment, politely redirect: "I can help you understand what the numbers mean, but for medical advice, please talk to your doctor."
6. If you don't have enough information to answer, say so honestly.
7. Keep responses concise — aim for 2-4 short paragraphs maximum.
8. When explaining lab values, use everyday comparisons when possible (e.g., "Think of cholesterol like traffic in your blood vessels").`;

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
