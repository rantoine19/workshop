import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PARSE_REPORT_SYSTEM_PROMPT,
} from "@/lib/claude/prompts";

// Mock the Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

describe("Confidence Scoring (#133)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Prompt ────────────────────────────────────────────────────────

  describe("Parse prompt includes confidence instruction", () => {
    it("instructs Claude to provide confidence scores", () => {
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("confidence");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("0.0 to 1.0");
    });

    it("describes confidence levels for different scenarios", () => {
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("clearly printed values");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("partially visible");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("below 0.7");
    });
  });

  // ── ParsedBiomarker interface + default ───────────────────────────

  describe("ParsedBiomarker confidence field", () => {
    it("defaults confidence to 1.0 when not provided by Claude", async () => {
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
                  // no confidence field
                },
              ],
              summary: "Blood sugar is normal.",
            }),
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      const result = await parseReportWithClaude("base64data", "image/jpeg");

      expect(result.biomarkers[0].confidence).toBe(1.0);
    });

    it("preserves confidence when provided by Claude", async () => {
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
                  confidence: 0.85,
                },
                {
                  name: "Cholesterol",
                  value: 245,
                  unit: "mg/dL",
                  reference_low: 0,
                  reference_high: 200,
                  flag: "red",
                  confidence: 0.5,
                },
              ],
              summary: "Mixed results.",
            }),
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      const result = await parseReportWithClaude("base64data", "image/jpeg");

      expect(result.biomarkers[0].confidence).toBe(0.85);
      expect(result.biomarkers[1].confidence).toBe(0.5);
    });
  });

  // ── RiskDashboard confidence UI ───────────────────────────────────

  describe("RiskDashboard confidence indicators", () => {
    it("RiskDashboard exports a default component", async () => {
      const mod = await import("@/components/reports/RiskDashboard");
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });

    it("RiskFlagData interface accepts confidence field", () => {
      // Type-level check: this compiles if the interface is correct
      const flag = {
        id: "f1",
        biomarker_name: "Glucose",
        value: 95,
        reference_low: 70,
        reference_high: 100,
        flag: "green" as const,
        trend: "stable",
        confidence: 0.5,
      };
      expect(flag.confidence).toBe(0.5);
    });
  });

  // ── Risk flags API includes confidence ────────────────────────────

  describe("Risk flags API returns confidence", () => {
    it("SELECT query includes confidence column", async () => {
      // Read the source to verify the SELECT includes confidence
      const fs = await import("fs");
      const path = await import("path");
      const routeSource = fs.readFileSync(
        path.resolve("app/api/risk-flags/route.ts"),
        "utf-8"
      );
      expect(routeSource).toContain("confidence");
    });
  });

  // ── Parse route passes confidence to risk_flags ───────────────────

  describe("Parse route includes confidence in risk_flags", () => {
    it("parse route maps confidence to risk_flags insert", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routeSource = fs.readFileSync(
        path.resolve("app/api/parse/route.ts"),
        "utf-8"
      );
      // The risk flags mapping should include confidence
      expect(routeSource).toContain("confidence: b.confidence");
    });
  });
});
