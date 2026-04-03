/**
 * Biomarker name and unit normalization.
 *
 * Maps raw biomarker names (as extracted by Claude) to canonical names
 * using the synonym index from biomarker-synonyms.ts.
 *
 * Handles: case-insensitive matching, prefix/suffix stripping,
 * abbreviation matching, and word-order variants.
 */

import { SYNONYM_INDEX, type BiomarkerMapping } from "./biomarker-synonyms";

export interface NormalizationResult {
  /** Canonical biomarker name (or original if no match) */
  canonical: string;
  /** Category grouping */
  category: string;
  /** Standard unit */
  unit: string;
  /** Whether a synonym match was found */
  matched: boolean;
}

/**
 * Common prefixes and suffixes to strip from biomarker names before matching.
 * These are frequently included in lab reports but not part of the core name.
 */
const STRIP_PATTERNS = [
  /^serum\s+/i,
  /^blood\s+/i,
  /^plasma\s+/i,
  /\s+level$/i,
  /\s+levels$/i,
  /\s+test$/i,
  /\s+count$/i,
  /\s+result$/i,
  /\s+value$/i,
  /\s+measurement$/i,
];

/**
 * Normalize raw text for matching: lowercase, collapse whitespace, trim.
 */
function cleanForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Try multiple matching strategies in order of specificity:
 * 1. Exact synonym match
 * 2. After stripping common prefixes/suffixes
 * 3. Word-order reversal (e.g., "Cholesterol, Total" -> "total cholesterol")
 * 4. Substring containment (the raw name contains a known synonym)
 */
function findMapping(rawName: string): BiomarkerMapping | null {
  const cleaned = cleanForMatch(rawName);

  // Strategy 1: Exact match on cleaned name
  const exact = SYNONYM_INDEX.get(cleaned);
  if (exact) return exact;

  // Strategy 2: Strip prefixes/suffixes and try again
  let stripped = cleaned;
  for (const pattern of STRIP_PATTERNS) {
    stripped = stripped.replace(pattern, "");
  }
  stripped = stripped.trim();
  if (stripped !== cleaned) {
    const match = SYNONYM_INDEX.get(stripped);
    if (match) return match;
  }

  // Strategy 3: Handle comma-separated word order ("Cholesterol, Total" -> "total cholesterol")
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map((p) => p.trim());
    const reversed = parts.reverse().join(" ");
    const match = SYNONYM_INDEX.get(reversed);
    if (match) return match;
  }

  // Strategy 4: Remove parenthetical content and retry
  const noParens = cleaned.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (noParens !== cleaned) {
    const match = SYNONYM_INDEX.get(noParens);
    if (match) return match;

    // Also try stripping prefixes from the no-parens version
    let strippedNoParens = noParens;
    for (const pattern of STRIP_PATTERNS) {
      strippedNoParens = strippedNoParens.replace(pattern, "");
    }
    strippedNoParens = strippedNoParens.trim();
    if (strippedNoParens !== noParens) {
      const m = SYNONYM_INDEX.get(strippedNoParens);
      if (m) return m;
    }
  }

  // Strategy 5: Check if cleaned name contains any known synonym as a substring
  // Only match synonyms >= 3 chars to avoid false positives
  let bestMatch: BiomarkerMapping | null = null;
  let bestLength = 0;
  for (const [synonym, mapping] of SYNONYM_INDEX) {
    if (synonym.length >= 3 && cleaned.includes(synonym) && synonym.length > bestLength) {
      bestMatch = mapping;
      bestLength = synonym.length;
    }
  }
  if (bestMatch) return bestMatch;

  return null;
}

/**
 * Normalize a raw biomarker name to its canonical form.
 *
 * @param rawName - The biomarker name as extracted from a lab report
 * @returns Normalization result with canonical name, category, unit, and match status
 */
export function normalizeBiomarkerName(rawName: string): NormalizationResult {
  if (!rawName || typeof rawName !== "string") {
    return {
      canonical: rawName || "",
      category: "Unknown",
      unit: "",
      matched: false,
    };
  }

  const mapping = findMapping(rawName);

  if (mapping) {
    return {
      canonical: mapping.canonical,
      category: mapping.category,
      unit: mapping.unit,
      matched: true,
    };
  }

  // No match found — return original name unchanged
  return {
    canonical: rawName.trim(),
    category: "Unknown",
    unit: "",
    matched: false,
  };
}

// ---------------------------------------------------------------------------
// Unit normalization
// ---------------------------------------------------------------------------

/**
 * Unit conversion factors keyed by canonical biomarker name.
 * Each entry maps fromUnit -> { factor, toUnit }.
 */
const UNIT_CONVERSIONS: Record<
  string,
  Record<string, { factor: number; toUnit: string }>
> = {
  "Glucose (Fasting)": {
    "mmol/l": { factor: 18.0182, toUnit: "mg/dL" },
  },
  "Total Cholesterol": {
    "mmol/l": { factor: 38.67, toUnit: "mg/dL" },
  },
  "LDL Cholesterol": {
    "mmol/l": { factor: 38.67, toUnit: "mg/dL" },
  },
  "HDL Cholesterol": {
    "mmol/l": { factor: 38.67, toUnit: "mg/dL" },
  },
  "Triglycerides": {
    "mmol/l": { factor: 88.57, toUnit: "mg/dL" },
  },
  "VLDL Cholesterol": {
    "mmol/l": { factor: 38.67, toUnit: "mg/dL" },
  },
  "Hemoglobin A1C": {
    "mmol/mol": { factor: 0.0915, toUnit: "%" }, // IFCC to NGSP: %A1C = 0.0915 * mmol/mol + 2.15
  },
  "Creatinine": {
    "umol/l": { factor: 0.0113, toUnit: "mg/dL" },
    "µmol/l": { factor: 0.0113, toUnit: "mg/dL" },
  },
  "BUN": {
    "mmol/l": { factor: 2.8, toUnit: "mg/dL" },
  },
  "Uric Acid": {
    "umol/l": { factor: 0.0168, toUnit: "mg/dL" },
    "µmol/l": { factor: 0.0168, toUnit: "mg/dL" },
  },
  "Calcium": {
    "mmol/l": { factor: 4.0, toUnit: "mg/dL" },
  },
  "Bilirubin Total": {
    "umol/l": { factor: 0.0585, toUnit: "mg/dL" },
    "µmol/l": { factor: 0.0585, toUnit: "mg/dL" },
  },
  "Bilirubin Direct": {
    "umol/l": { factor: 0.0585, toUnit: "mg/dL" },
    "µmol/l": { factor: 0.0585, toUnit: "mg/dL" },
  },
  "Iron": {
    "umol/l": { factor: 5.587, toUnit: "mcg/dL" },
    "µmol/l": { factor: 5.587, toUnit: "mcg/dL" },
  },
  "Vitamin D": {
    "nmol/l": { factor: 0.4, toUnit: "ng/mL" },
  },
};

/**
 * Normalize a biomarker value from one unit to the standard unit.
 *
 * @param value - The numeric value
 * @param fromUnit - The unit as reported by the lab
 * @param biomarker - The canonical biomarker name
 * @returns Normalized value and unit, or original if no conversion needed
 */
export function normalizeUnit(
  value: number,
  fromUnit: string,
  biomarker: string
): { value: number; unit: string } {
  const conversions = UNIT_CONVERSIONS[biomarker];
  if (!conversions) {
    return { value, unit: fromUnit };
  }

  const normalizedFromUnit = fromUnit.toLowerCase().replace(/\s+/g, "");
  const conversion = conversions[normalizedFromUnit];
  if (!conversion) {
    return { value, unit: fromUnit };
  }

  // Special case: A1C IFCC to NGSP needs addition
  if (biomarker === "Hemoglobin A1C" && normalizedFromUnit === "mmol/mol") {
    return {
      value: Math.round((value * 0.0915 + 2.15) * 10) / 10,
      unit: conversion.toUnit,
    };
  }

  return {
    value: Math.round(value * conversion.factor * 100) / 100,
    unit: conversion.toUnit,
  };
}
