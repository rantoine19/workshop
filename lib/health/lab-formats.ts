/**
 * Lab format database — known lab providers with formatting patterns and parsing hints.
 *
 * Used by the format detection system (#134) to provide format-specific
 * guidance to the Claude parse prompt, improving extraction accuracy.
 */

export interface LabFormat {
  /** Canonical provider name (e.g., "Quest Diagnostics") */
  provider: string;
  /** Text patterns that identify this provider (lowercase) */
  aliases: string[];
  /** Format-specific hints appended to the parse prompt */
  hints: string;
  /** Description of the typical report layout */
  commonLayout: string;
}

/**
 * Database of known lab providers and their formatting patterns.
 *
 * Each entry includes aliases for keyword matching, layout description
 * for context, and hints that are injected into the parse prompt.
 */
export const LAB_FORMATS: LabFormat[] = [
  {
    provider: "Quest Diagnostics",
    aliases: [
      "quest",
      "quest diagnostics",
      "questdiagnostics.com",
      "quest diagnostics llc",
    ],
    commonLayout:
      "Table format with columns: Test Name, Result, Flag, Reference Range, Units. " +
      "Results organized by panel (lipid, metabolic, CBC). Patient info at top.",
    hints:
      "This appears to be a Quest Diagnostics report. " +
      "Quest uses H/L flags for high/low values. " +
      "Reference ranges are shown in X-Y format. " +
      "Units appear in a separate column. " +
      "Results are grouped by panel (e.g., Comprehensive Metabolic Panel, Lipid Panel, CBC). " +
      "Look for the table header row to identify column positions.",
  },
  {
    provider: "LabCorp",
    aliases: [
      "labcorp",
      "laboratory corporation",
      "laboratory corporation of america",
      "labcorp.com",
    ],
    commonLayout:
      "Table format with Test name, result, reference range. " +
      "Often includes previous results for comparison in a side column.",
    hints:
      "This appears to be a LabCorp report. " +
      "LabCorp uses asterisks (*) or bold to mark abnormal values. " +
      "Reference ranges include age/sex-specific notes. " +
      "Previous results may appear in an adjacent column for comparison. " +
      "Pay attention to footnotes which may qualify reference ranges.",
  },
  {
    provider: "BioReference Laboratories",
    aliases: [
      "bioreference",
      "bio-reference",
      "bioreference laboratories",
      "bioreference.com",
      "genoptix",
    ],
    commonLayout:
      "Tabular layout with test name, result, units, and reference range columns. " +
      "Results may span multiple pages grouped by test category.",
    hints:
      "This appears to be a BioReference Laboratories report. " +
      "Results are presented in a standard table format. " +
      "Abnormal values are typically flagged with H (high) or L (low). " +
      "Reference ranges use dash-separated format (e.g., 70-100).",
  },
  {
    provider: "Sonic Healthcare",
    aliases: [
      "sonic healthcare",
      "sonic",
      "clinical pathology laboratories",
      "cpl",
      "sunrise medical laboratories",
    ],
    commonLayout:
      "Standard tabular format. May include cumulative report showing " +
      "historical values alongside current results.",
    hints:
      "This appears to be a Sonic Healthcare / CPL report. " +
      "Results use a standard tabular format with test, result, units, and range columns. " +
      "Abnormal results flagged with H/L markers. " +
      "May include a cumulative view with historical values.",
  },
  {
    provider: "ARUP Laboratories",
    aliases: [
      "arup",
      "arup laboratories",
      "arup labs",
      "aruplab.com",
      "associated regional and university pathologists",
    ],
    commonLayout:
      "Clean tabular format. Test name, result, flag, reference interval, lab location. " +
      "Often includes specimen information and ordering physician.",
    hints:
      "This appears to be an ARUP Laboratories report. " +
      "ARUP uses a clean tabular layout with test name, result, flag, and reference interval columns. " +
      "Reference intervals may include method-specific notes. " +
      "Flags use H/L for high/low out of range.",
  },
  {
    provider: "Mayo Clinic Laboratories",
    aliases: [
      "mayo clinic",
      "mayo clinic laboratories",
      "mayo medical laboratories",
      "mayocliniclabs.com",
    ],
    commonLayout:
      "Detailed format with test name, result, units, reference range, and interpretation notes. " +
      "Often includes extensive interpretive commentary.",
    hints:
      "This appears to be a Mayo Clinic Laboratories report. " +
      "Mayo reports include detailed interpretive comments alongside results. " +
      "Reference ranges may include age/sex/method-specific qualifiers. " +
      "Look for both the tabular results and any narrative interpretation sections.",
  },
  {
    provider: "Eurofins",
    aliases: [
      "eurofins",
      "eurofins clinical diagnostics",
      "eurofins-us.com",
      "diatherix eurofins",
    ],
    commonLayout:
      "Table-based format with test panels clearly delineated. " +
      "Results include test name, observed value, units, and reference range.",
    hints:
      "This appears to be a Eurofins report. " +
      "Results are organized in panel groupings. " +
      "Standard H/L flagging for out-of-range values. " +
      "Reference ranges in standard dash notation.",
  },
  {
    provider: "Kaiser Permanente",
    aliases: [
      "kaiser",
      "kaiser permanente",
      "kp.org",
      "kaiser foundation",
    ],
    commonLayout:
      "Health system format with results listed by test category. " +
      "May use a portal-style layout with results, ranges, and status indicators.",
    hints:
      "This appears to be a Kaiser Permanente lab report. " +
      "Results may be presented in a health portal format. " +
      "Standard/abnormal indicators may use color coding or text flags. " +
      "Reference ranges are typically shown inline with results.",
  },
  {
    provider: "Hospital / Health System",
    aliases: [
      "hospital",
      "medical center",
      "health system",
      "university hospital",
      "community hospital",
      "regional medical",
    ],
    commonLayout:
      "Varies widely. Often uses narrative format, simple lists, or " +
      "EHR-generated tabular layouts (Epic MyChart, Cerner, etc.).",
    hints:
      "This appears to be a hospital or health system lab report. " +
      "Format may vary — look for patterns like 'Test: Value Unit (Range)' or tabular data. " +
      "Results may be embedded in a larger clinical document. " +
      "Pay close attention to units and reference ranges as formatting is less standardized.",
  },
  {
    provider: "Generic / Unknown",
    aliases: [],
    commonLayout: "Unknown format. Could be any lab provider or international format.",
    hints:
      "Unknown lab format. Extract data carefully and report lower confidence " +
      "for ambiguous values. Look for common patterns: tabular data, " +
      "test name followed by numeric value and unit, reference ranges in parentheses or after a dash.",
  },
];

/** The fallback format used when no provider is detected */
export const GENERIC_LAB_FORMAT = LAB_FORMATS[LAB_FORMATS.length - 1];

/**
 * Find a lab format by provider name (case-insensitive).
 * Returns the generic format if no match found.
 */
export function getLabFormatByProvider(provider: string): LabFormat {
  const lower = provider.toLowerCase().trim();
  return (
    LAB_FORMATS.find(
      (f) =>
        f.provider.toLowerCase() === lower ||
        f.aliases.some((a) => a === lower)
    ) ?? GENERIC_LAB_FORMAT
  );
}
