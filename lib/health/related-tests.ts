/**
 * Related test suggestion engine for HealthChat AI.
 *
 * Based on flagged biomarkers, suggests additional tests that provide
 * more context, helping users have informed conversations with their doctor.
 *
 * IMPORTANT: These are informational suggestions, NOT medical orders.
 */

import { getBiomarkerKnowledge } from "./biomarker-knowledge";

export interface FlaggedBiomarkerInput {
  name: string;
  flag: "green" | "yellow" | "red";
}

interface TestSuggestion {
  /** The flagged biomarker that prompted this suggestion */
  fromBiomarker: string;
  /** Flag level of the source biomarker */
  flag: "yellow" | "red";
  /** Name of the suggested test */
  suggestedTest: string;
  /** Plain-language reason why this test would be helpful */
  reason: string;
}

/**
 * Suggest related tests based on flagged biomarkers.
 * Returns a formatted string suitable for inclusion in a chat system prompt.
 *
 * - Only suggests for yellow/red flagged biomarkers
 * - Deduplicates suggestions (same test won't appear twice)
 * - Limited to top 3 suggestions to avoid overwhelm
 */
export function suggestRelatedTests(
  biomarkers: FlaggedBiomarkerInput[]
): string {
  const flagged = biomarkers.filter(
    (b) => b.flag === "red" || b.flag === "yellow"
  );

  if (flagged.length === 0) {
    return "";
  }

  // Collect names of biomarkers already in the report (so we don't suggest tests they already have)
  const existingTests = new Set(
    biomarkers.map((b) => b.name.toLowerCase())
  );

  const suggestions: TestSuggestion[] = [];
  const suggestedTestNames = new Set<string>();

  // Sort: red first
  const sorted = [...flagged].sort((a, b) => {
    if (a.flag === "red" && b.flag !== "red") return -1;
    if (a.flag !== "red" && b.flag === "red") return 1;
    return 0;
  });

  for (const biomarker of sorted) {
    const knowledge = getBiomarkerKnowledge(biomarker.name);
    if (!knowledge || knowledge.relatedTests.length === 0) continue;

    for (const relatedTest of knowledge.relatedTests) {
      const testKey = relatedTest.toLowerCase();

      // Skip if they already have this test or we already suggested it
      if (existingTests.has(testKey) || suggestedTestNames.has(testKey)) {
        continue;
      }

      suggestedTestNames.add(testKey);
      suggestions.push({
        fromBiomarker: biomarker.name,
        flag: biomarker.flag as "yellow" | "red",
        suggestedTest: relatedTest,
        reason: buildReason(biomarker.name, biomarker.flag, relatedTest),
      });
    }
  }

  // Limit to top 3
  const topSuggestions = suggestions.slice(0, 3);

  if (topSuggestions.length === 0) {
    return "";
  }

  const lines: string[] = [
    "RELATED TEST SUGGESTIONS (tests the patient could ask their doctor about):",
    "",
  ];

  for (const suggestion of topSuggestions) {
    lines.push(`- Because ${suggestion.fromBiomarker} is flagged: consider asking about ${suggestion.suggestedTest}`);
    lines.push(`  Reason: ${suggestion.reason}`);
  }

  lines.push("");
  lines.push(
    "When mentioning these, frame them as conversation starters with their doctor, not orders."
  );

  return lines.join("\n");
}

/**
 * Build a plain-language reason for suggesting a related test.
 */
function buildReason(
  fromBiomarker: string,
  flag: string,
  suggestedTest: string
): string {
  const flagLabel = flag === "red" ? "outside normal range" : "borderline";

  // Custom reasons for common pairings
  const pairings: Record<string, Record<string, string>> = {
    "glucose (fasting)": {
      "hemoglobin a1c":
        "A1C gives a 2-3 month average of blood sugar, providing a fuller picture than a single fasting test.",
    },
    "hemoglobin a1c": {
      "glucose (fasting)":
        "Fasting glucose confirms your current blood sugar level alongside the A1C average.",
    },
    "total cholesterol": {
      "cholesterol/hdl ratio":
        "The ratio of total cholesterol to HDL is a more specific indicator of heart risk.",
    },
    hemoglobin: {
      iron: "Iron levels help determine if iron deficiency is the cause of low hemoglobin.",
      "vitamin b12":
        "B12 deficiency is a common cause of anemia that's easy to treat once identified.",
    },
    "vitamin d": {
      calcium:
        "Vitamin D and calcium work together for bone health. Low D can affect calcium levels.",
    },
    tsh: {
      "total cholesterol":
        "Thyroid problems can affect cholesterol levels. Checking both gives a complete picture.",
    },
  };

  const fromKey = fromBiomarker.toLowerCase();
  const toKey = suggestedTest.toLowerCase();

  if (pairings[fromKey]?.[toKey]) {
    return pairings[fromKey][toKey];
  }

  // Generic reason
  return `Since your ${fromBiomarker} is ${flagLabel}, ${suggestedTest} can provide additional context for your doctor.`;
}
