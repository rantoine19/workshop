import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PARSE_REPORT_SYSTEM_PROMPT,
  buildParsePrompt,
} from "@/lib/claude/prompts";
import { LAB_FORMATS, GENERIC_LAB_FORMAT, getLabFormatByProvider } from "@/lib/health/lab-formats";
import {
  detectLabFormatFromText,
  detectLabFormatFromFilename,
  resolveLabProvider,
} from "@/lib/health/detect-lab-format";

// Mock the Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

describe("Format Fingerprinting (#134)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Lab Format Database ────────────────────────────────────────────

  describe("Lab format database", () => {
    it("has entries for major providers", () => {
      const providers = LAB_FORMATS.map((f) => f.provider);
      expect(providers).toContain("Quest Diagnostics");
      expect(providers).toContain("LabCorp");
      expect(providers).toContain("ARUP Laboratories");
      expect(providers).toContain("Mayo Clinic Laboratories");
      expect(providers).toContain("BioReference Laboratories");
      expect(providers).toContain("Sonic Healthcare");
    });

    it("has at least 8 providers (including generic)", () => {
      expect(LAB_FORMATS.length).toBeGreaterThanOrEqual(8);
    });

    it("each format has required fields", () => {
      for (const format of LAB_FORMATS) {
        expect(format.provider).toBeTruthy();
        expect(typeof format.hints).toBe("string");
        expect(format.hints.length).toBeGreaterThan(0);
        expect(typeof format.commonLayout).toBe("string");
        expect(format.commonLayout.length).toBeGreaterThan(0);
      }
    });

    it("generic format has no aliases", () => {
      expect(GENERIC_LAB_FORMAT.aliases).toEqual([]);
      expect(GENERIC_LAB_FORMAT.provider).toBe("Generic / Unknown");
    });

    it("all aliases are lowercase", () => {
      for (const format of LAB_FORMATS) {
        for (const alias of format.aliases) {
          expect(alias).toBe(alias.toLowerCase());
        }
      }
    });

    it("getLabFormatByProvider finds Quest Diagnostics", () => {
      const result = getLabFormatByProvider("Quest Diagnostics");
      expect(result.provider).toBe("Quest Diagnostics");
    });

    it("getLabFormatByProvider is case-insensitive", () => {
      const result = getLabFormatByProvider("labcorp");
      expect(result.provider).toBe("LabCorp");
    });

    it("getLabFormatByProvider returns generic for unknown", () => {
      const result = getLabFormatByProvider("Unknown Lab XYZ");
      expect(result.provider).toBe("Generic / Unknown");
    });
  });

  // ── Keyword Detection ──────────────────────────────────────────────

  describe("Keyword detection from text", () => {
    it("detects Quest Diagnostics from text", () => {
      const result = detectLabFormatFromText("Quest Diagnostics\nPatient: John Doe\nTest results follow");
      expect(result.provider).toBe("Quest Diagnostics");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("detects LabCorp from text", () => {
      const result = detectLabFormatFromText("Laboratory Corporation of America\nReport Date: 2024-01-15");
      expect(result.provider).toBe("LabCorp");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("detects ARUP from text", () => {
      const result = detectLabFormatFromText("ARUP Laboratories\nSpecimen collected 2024-01-15");
      expect(result.provider).toBe("ARUP Laboratories");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("detects Kaiser Permanente from text", () => {
      const result = detectLabFormatFromText("Kaiser Permanente Lab Results\nMember ID: 12345");
      expect(result.provider).toBe("Kaiser Permanente");
    });

    it("returns null provider for unrecognized text", () => {
      const result = detectLabFormatFromText("Some random text with no lab info");
      expect(result.provider).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("returns generic hints for unrecognized text", () => {
      const result = detectLabFormatFromText("No lab provider mentioned here");
      expect(result.hints).toContain("Unknown lab format");
    });

    it("returns null provider for empty text", () => {
      const result = detectLabFormatFromText("");
      expect(result.provider).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("returns null provider for whitespace-only text", () => {
      const result = detectLabFormatFromText("   \n  ");
      expect(result.provider).toBeNull();
    });

    it("is case-insensitive", () => {
      const result = detectLabFormatFromText("QUEST DIAGNOSTICS LLC");
      expect(result.provider).toBe("Quest Diagnostics");
    });

    it("only scans first ~500 characters", () => {
      const padding = "x".repeat(600);
      const result = detectLabFormatFromText(padding + " Quest Diagnostics");
      expect(result.provider).toBeNull();
    });

    it("prefers longer alias matches for higher confidence", () => {
      const result1 = detectLabFormatFromText("quest");
      const result2 = detectLabFormatFromText("quest diagnostics");
      expect(result2.confidence).toBeGreaterThan(result1.confidence);
    });
  });

  // ── Filename Detection ─────────────────────────────────────────────

  describe("Keyword detection from filename", () => {
    it("detects Quest from filename", () => {
      const result = detectLabFormatFromFilename("quest_diagnostics_results.pdf");
      expect(result.provider).toBe("Quest Diagnostics");
    });

    it("detects LabCorp from filename", () => {
      const result = detectLabFormatFromFilename("labcorp-blood-panel.pdf");
      expect(result.provider).toBe("LabCorp");
    });

    it("returns null for generic filenames", () => {
      const result = detectLabFormatFromFilename("blood_test_results.pdf");
      expect(result.provider).toBeNull();
    });

    it("filename detection has lower confidence than text detection", () => {
      const filenameResult = detectLabFormatFromFilename("quest_results.pdf");
      const textResult = detectLabFormatFromText("Quest Diagnostics LLC");
      if (filenameResult.provider && textResult.provider) {
        expect(filenameResult.confidence).toBeLessThan(textResult.confidence);
      }
    });

    it("handles empty filename", () => {
      const result = detectLabFormatFromFilename("");
      expect(result.provider).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  // ── Provider Resolution ────────────────────────────────────────────

  describe("Resolve lab provider (keyword vs Claude)", () => {
    it("prefers Claude report_source over keyword detection", () => {
      const keywordResult = {
        provider: "Quest Diagnostics",
        confidence: 0.7,
        hints: "Quest hints",
        format: LAB_FORMATS[0],
      };
      const result = resolveLabProvider(keywordResult, "LabCorp");
      expect(result.provider).toBe("LabCorp");
      expect(result.confidence).toBe(0.9);
    });

    it("falls back to keyword detection when Claude returns null", () => {
      const keywordResult = {
        provider: "Quest Diagnostics",
        confidence: 0.7,
        hints: "Quest hints",
        format: LAB_FORMATS[0],
      };
      const result = resolveLabProvider(keywordResult, null);
      expect(result.provider).toBe("Quest Diagnostics");
      expect(result.confidence).toBe(0.7);
    });

    it("falls back to keyword detection when Claude returns empty string", () => {
      const keywordResult = {
        provider: "LabCorp",
        confidence: 0.65,
        hints: "LabCorp hints",
        format: LAB_FORMATS[1],
      };
      const result = resolveLabProvider(keywordResult, "");
      expect(result.provider).toBe("LabCorp");
      expect(result.confidence).toBe(0.65);
    });

    it("returns null when neither source has a provider", () => {
      const keywordResult = {
        provider: null,
        confidence: 0,
        hints: "generic",
        format: GENERIC_LAB_FORMAT,
      };
      const result = resolveLabProvider(keywordResult, null);
      expect(result.provider).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  // ── Parse Prompt ───────────────────────────────────────────────────

  describe("Parse prompt includes format hints", () => {
    it("system prompt requests report_source extraction", () => {
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("report_source");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("lab provider name");
    });

    it("buildParsePrompt returns base prompt without hints", () => {
      const prompt = buildParsePrompt();
      expect(prompt).toBe(PARSE_REPORT_SYSTEM_PROMPT);
    });

    it("buildParsePrompt appends FORMAT HINTS when provided", () => {
      const hints = "Quest uses H/L flags for high/low.";
      const prompt = buildParsePrompt(hints);
      expect(prompt).toContain("FORMAT HINTS:");
      expect(prompt).toContain(hints);
      expect(prompt).toContain(PARSE_REPORT_SYSTEM_PROMPT);
    });
  });

  // ── ParsedReportResult interface ───────────────────────────────────

  describe("ParsedReportResult includes report_source", () => {
    it("accepts report_source in parsed response", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              biomarkers: [
                {
                  name: "Glucose",
                  value: 95,
                  unit: "mg/dL",
                  reference_low: 70,
                  reference_high: 100,
                  flag: "green",
                  confidence: 1.0,
                },
              ],
              summary: "Normal blood sugar.",
              report_date: "2024-01-15",
              report_source: "Quest Diagnostics",
            }),
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      const result = await parseReportWithClaude("base64data", "image/jpeg");
      expect(result.report_source).toBe("Quest Diagnostics");
    });

    it("handles missing report_source gracefully", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              biomarkers: [],
              summary: "No results.",
              report_date: null,
            }),
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      const result = await parseReportWithClaude("base64data", "image/jpeg");
      expect(result.report_source).toBeUndefined();
    });
  });

  // ── Parse route integration ────────────────────────────────────────

  describe("Parse route stores lab_provider", () => {
    it("parse route imports format detection", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routeSource = fs.readFileSync(
        path.resolve("app/api/parse/route.ts"),
        "utf-8"
      );
      expect(routeSource).toContain("detectLabFormatFromFilename");
      expect(routeSource).toContain("resolveLabProvider");
    });

    it("parse route stores lab_provider on report update", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routeSource = fs.readFileSync(
        path.resolve("app/api/parse/route.ts"),
        "utf-8"
      );
      expect(routeSource).toContain("lab_provider");
      expect(routeSource).toContain("lab_format_confidence");
    });

    it("parse route returns lab_provider in response", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routeSource = fs.readFileSync(
        path.resolve("app/api/parse/route.ts"),
        "utf-8"
      );
      expect(routeSource).toContain("lab_provider: labProvider.provider");
      expect(routeSource).toContain("lab_format_confidence: labProvider.confidence");
    });
  });

  // ── Report detail page ─────────────────────────────────────────────

  describe("Report detail page shows lab provider", () => {
    it("report page includes lab_provider in ReportData interface", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pageSource = fs.readFileSync(
        path.resolve("app/reports/[id]/page.tsx"),
        "utf-8"
      );
      expect(pageSource).toContain("lab_provider: string | null");
    });

    it("report page renders lab provider badge", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pageSource = fs.readFileSync(
        path.resolve("app/reports/[id]/page.tsx"),
        "utf-8"
      );
      expect(pageSource).toContain("report-results__lab-provider");
      expect(pageSource).toContain("report.lab_provider");
    });
  });

  // ── Database migration ─────────────────────────────────────────────

  describe("Database migration", () => {
    it("migration adds lab_provider and lab_format_confidence columns", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const migrationSource = fs.readFileSync(
        path.resolve("supabase/migrations/020_report_lab_provider.sql"),
        "utf-8"
      );
      expect(migrationSource).toContain("lab_provider text");
      expect(migrationSource).toContain("lab_format_confidence numeric");
    });
  });

  // ── Fallback behavior ──────────────────────────────────────────────

  describe("Graceful fallback for unknown formats", () => {
    it("generic format provides useful fallback hints", () => {
      expect(GENERIC_LAB_FORMAT.hints).toContain("Unknown lab format");
      expect(GENERIC_LAB_FORMAT.hints).toContain("lower confidence");
    });

    it("detection never throws on invalid input", () => {
      expect(() => detectLabFormatFromText("")).not.toThrow();
      expect(() => detectLabFormatFromText("   ")).not.toThrow();
      expect(() => detectLabFormatFromFilename("")).not.toThrow();
      expect(() => resolveLabProvider(
        { provider: null, confidence: 0, hints: "", format: GENERIC_LAB_FORMAT },
        null
      )).not.toThrow();
    });
  });
});
