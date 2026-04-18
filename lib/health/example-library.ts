/**
 * Few-shot example library — query and format extraction examples (#135).
 *
 * Retrieves anonymized extraction examples from the database and formats
 * them as a few-shot prompt section for improved parsing accuracy.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { AnonymizedExtraction, RawBiomarker } from "./anonymize-extraction";
import { anonymizeExtraction } from "./anonymize-extraction";

/** Maximum examples to include in a prompt (context window management) */
const MAX_PROMPT_EXAMPLES = 2;

/** Maximum examples stored per lab provider (prevent bloat) */
const MAX_EXAMPLES_PER_PROVIDER = 5;

/** Minimum biomarker count for an extraction to be stored as an example */
const MIN_BIOMARKER_COUNT = 3;

/** Minimum average confidence for an extraction to be stored as an example */
const MIN_AVG_CONFIDENCE = 0.7;

interface ExtractionExampleRow {
  id: string;
  lab_provider: string | null;
  file_type: string;
  biomarker_count: number;
  anonymized_extraction: AnonymizedExtraction;
  quality_score: number;
  usage_count: number;
}

/**
 * Find matching few-shot examples and format them as a prompt section.
 *
 * Match priority:
 * 1. lab_provider match (most relevant — same lab format)
 * 2. file_type match (fallback — at least similar document type)
 *
 * Returns a formatted prompt string, or empty string if no examples found.
 */
export async function findMatchingExamples(
  supabase: SupabaseClient,
  labProvider: string | null,
  fileType: string,
  maxExamples: number = MAX_PROMPT_EXAMPLES
): Promise<string> {
  const limit = Math.min(maxExamples, MAX_PROMPT_EXAMPLES);
  let examples: ExtractionExampleRow[] = [];

  // Priority 1: Match by lab provider
  if (labProvider) {
    const { data } = await supabase
      .from("extraction_examples")
      .select("id, lab_provider, file_type, biomarker_count, anonymized_extraction, quality_score, usage_count")
      .eq("lab_provider", labProvider)
      .order("quality_score", { ascending: false })
      .limit(limit);

    if (data && data.length > 0) {
      examples = data as ExtractionExampleRow[];
    }
  }

  // Priority 2: Fall back to file type match if no provider-specific examples
  if (examples.length === 0) {
    const { data } = await supabase
      .from("extraction_examples")
      .select("id, lab_provider, file_type, biomarker_count, anonymized_extraction, quality_score, usage_count")
      .eq("file_type", fileType)
      .order("quality_score", { ascending: false })
      .limit(limit);

    if (data && data.length > 0) {
      examples = data as ExtractionExampleRow[];
    }
  }

  if (examples.length === 0) {
    return "";
  }

  // Format as a few-shot prompt section
  const exampleBlocks = examples.map((ex, i) => {
    const json = JSON.stringify(ex.anonymized_extraction, null, 2);
    return `Example ${i + 1}:\n${json}`;
  });

  return [
    "Here are examples of successfully extracted results from similar reports:",
    "",
    ...exampleBlocks,
    "",
    "Use these examples as a reference for the expected output format and biomarker naming conventions.",
  ].join("\n");
}

/**
 * Check whether a parsed extraction meets quality thresholds for storage.
 *
 * Requirements:
 * - At least MIN_BIOMARKER_COUNT biomarkers extracted
 * - Average confidence >= MIN_AVG_CONFIDENCE
 */
export function meetsQualityThreshold(
  biomarkers: RawBiomarker[]
): boolean {
  if (biomarkers.length < MIN_BIOMARKER_COUNT) {
    return false;
  }

  const avgConfidence =
    biomarkers.reduce((sum, b) => sum + (b.confidence ?? 1.0), 0) /
    biomarkers.length;

  // Use epsilon comparison to handle floating-point precision issues
  return avgConfidence >= MIN_AVG_CONFIDENCE - 1e-9;
}

/**
 * Store an anonymized extraction example if quality thresholds are met
 * and we haven't exceeded the per-provider limit.
 *
 * Returns true if a new example was stored, false otherwise.
 */
export async function storeExtractionExample(
  supabase: SupabaseClient,
  labProvider: string | null,
  fileType: string,
  biomarkers: RawBiomarker[]
): Promise<boolean> {
  // Check quality threshold
  if (!meetsQualityThreshold(biomarkers)) {
    return false;
  }

  // Check per-provider limit
  if (labProvider) {
    const { count } = await supabase
      .from("extraction_examples")
      .select("id", { count: "exact", head: true })
      .eq("lab_provider", labProvider);

    if (count != null && count >= MAX_EXAMPLES_PER_PROVIDER) {
      return false;
    }
  } else {
    // For null provider, check by file type to avoid unbounded growth
    const { count } = await supabase
      .from("extraction_examples")
      .select("id", { count: "exact", head: true })
      .is("lab_provider", null)
      .eq("file_type", fileType);

    if (count != null && count >= MAX_EXAMPLES_PER_PROVIDER) {
      return false;
    }
  }

  // Anonymize and store
  const anonymized = anonymizeExtraction(biomarkers);

  const avgConfidence =
    biomarkers.reduce((sum, b) => sum + (b.confidence ?? 1.0), 0) /
    biomarkers.length;

  const { error } = await supabase.from("extraction_examples").insert({
    lab_provider: labProvider,
    file_type: fileType,
    biomarker_count: biomarkers.length,
    anonymized_extraction: anonymized,
    quality_score: Math.round(avgConfidence * 100) / 100,
  });

  if (error) {
    console.error("[FEW-SHOT] Failed to store extraction example:", error.message);
    return false;
  }

  return true;
}

/**
 * Increment usage_count on examples that were used in a parse.
 * Fire-and-forget — errors are logged but don't break the pipeline.
 */
export async function incrementExampleUsage(
  supabase: SupabaseClient,
  labProvider: string | null,
  fileType: string
): Promise<void> {
  // We increment all examples that would have been matched,
  // since we don't track which specific examples were used in the prompt.
  if (labProvider) {
    const { data } = await supabase
      .from("extraction_examples")
      .select("id, usage_count")
      .eq("lab_provider", labProvider)
      .order("quality_score", { ascending: false })
      .limit(MAX_PROMPT_EXAMPLES);

    if (data) {
      for (const row of data) {
        await supabase
          .from("extraction_examples")
          .update({ usage_count: (row.usage_count ?? 0) + 1 })
          .eq("id", row.id);
      }
    }
  }
}
