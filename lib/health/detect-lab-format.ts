/**
 * Lab format detection — two-pass approach (#134).
 *
 * Pass 1 (this file): Fast keyword matching against the first ~500 characters
 * of extracted text or the filename. No API call required.
 *
 * Pass 2 (in parse prompt): Claude identifies the lab provider during parsing
 * and returns it as `report_source`. The parse route prefers Claude's answer
 * over keyword matching.
 */

import { LAB_FORMATS, GENERIC_LAB_FORMAT, type LabFormat } from "./lab-formats";

export interface FormatDetectionResult {
  /** Detected provider name, or null if unknown */
  provider: string | null;
  /** Confidence score 0-1 */
  confidence: number;
  /** Format-specific hints for the parse prompt */
  hints: string;
  /** The full lab format entry (for reference) */
  format: LabFormat;
}

/**
 * Detect lab provider from text using keyword matching (Pass 1).
 *
 * Scans the provided text for known lab provider aliases.
 * Only checks the first ~500 characters for efficiency.
 *
 * @param text - The text to search (could be file content or filename)
 * @returns Detection result with provider, confidence, and hints
 */
export function detectLabFormatFromText(text: string): FormatDetectionResult {
  if (!text || text.trim().length === 0) {
    return {
      provider: null,
      confidence: 0,
      hints: GENERIC_LAB_FORMAT.hints,
      format: GENERIC_LAB_FORMAT,
    };
  }

  // Only scan first ~500 chars for efficiency (provider info is typically at top)
  const searchText = text.slice(0, 500).toLowerCase();

  let bestMatch: LabFormat | null = null;
  let bestConfidence = 0;
  let bestAliasLength = 0;

  for (const format of LAB_FORMATS) {
    // Skip the generic format — it has no aliases
    if (format.aliases.length === 0) continue;

    for (const alias of format.aliases) {
      if (searchText.includes(alias)) {
        // Longer alias matches are more specific and get higher confidence
        const aliasConfidence = Math.min(0.6 + alias.length * 0.03, 0.9);

        // Prefer the longest matching alias (more specific = more confident)
        if (
          aliasConfidence > bestConfidence ||
          (aliasConfidence === bestConfidence && alias.length > bestAliasLength)
        ) {
          bestMatch = format;
          bestConfidence = aliasConfidence;
          bestAliasLength = alias.length;
        }
      }
    }
  }

  if (bestMatch) {
    return {
      provider: bestMatch.provider,
      confidence: bestConfidence,
      hints: bestMatch.hints,
      format: bestMatch,
    };
  }

  return {
    provider: null,
    confidence: 0,
    hints: GENERIC_LAB_FORMAT.hints,
    format: GENERIC_LAB_FORMAT,
  };
}

/**
 * Detect lab provider from a filename.
 *
 * Filenames often contain lab provider names (e.g., "quest_diagnostics_results.pdf").
 * This is a convenience wrapper around detectLabFormatFromText.
 *
 * @param filename - The original filename
 * @returns Detection result
 */
export function detectLabFormatFromFilename(filename: string): FormatDetectionResult {
  if (!filename) {
    return {
      provider: null,
      confidence: 0,
      hints: GENERIC_LAB_FORMAT.hints,
      format: GENERIC_LAB_FORMAT,
    };
  }

  // Normalize filename: replace underscores/hyphens with spaces, remove extension
  const normalized = filename
    .replace(/\.[^.]+$/, "") // remove extension
    .replace(/[_-]/g, " ")  // normalize separators
    .toLowerCase();

  const result = detectLabFormatFromText(normalized);

  // Filename-based detection is less confident than content-based
  if (result.provider) {
    return {
      ...result,
      confidence: Math.max(result.confidence - 0.1, 0.3),
    };
  }

  return result;
}

/**
 * Resolve final lab provider from keyword detection + Claude detection.
 *
 * Claude's identification (Pass 2) takes priority over keyword matching (Pass 1)
 * when available, since Claude can read the full document context.
 *
 * @param keywordResult - Result from keyword-based detection
 * @param claudeReportSource - The report_source field from Claude's response
 * @returns Final provider name and confidence
 */
export function resolveLabProvider(
  keywordResult: FormatDetectionResult,
  claudeReportSource: string | null | undefined
): { provider: string | null; confidence: number } {
  if (claudeReportSource && claudeReportSource.trim().length > 0) {
    // Claude identified a provider — trust it with high confidence
    return {
      provider: claudeReportSource.trim(),
      confidence: 0.9,
    };
  }

  // Fall back to keyword detection
  return {
    provider: keywordResult.provider,
    confidence: keywordResult.confidence,
  };
}
