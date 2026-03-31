import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PARSE_REPORT_SYSTEM_PROMPT,
  PARSE_REPORT_USER_PROMPT,
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

describe("Document parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prompts", () => {
    it("system prompt instructs extraction only — no medical advice", () => {
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain(
        "do NOT provide medical advice"
      );
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain(
        "Do NOT interpret, diagnose, or suggest treatments"
      );
    });

    it("system prompt requires JSON response format", () => {
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("valid JSON");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("biomarkers");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("summary");
    });

    it("system prompt specifies 5th grade reading level for summary", () => {
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("5th grade");
    });

    it("user prompt requests structured extraction", () => {
      expect(PARSE_REPORT_USER_PROMPT).toContain("biomarkers");
      expect(PARSE_REPORT_USER_PROMPT).toContain("structured JSON");
    });
  });

  describe("parseReportWithClaude", () => {
    it("parses valid Claude response into structured data", async () => {
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
                },
                {
                  name: "Cholesterol",
                  value: 245,
                  unit: "mg/dL",
                  reference_low: 0,
                  reference_high: 200,
                  flag: "red",
                },
              ],
              summary:
                "This blood test shows your sugar levels are normal. Your cholesterol is higher than it should be.",
            }),
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      const result = await parseReportWithClaude("base64data", "image/jpeg");

      expect(result.biomarkers).toHaveLength(2);
      expect(result.biomarkers[0].name).toBe("Glucose");
      expect(result.biomarkers[0].flag).toBe("green");
      expect(result.biomarkers[1].name).toBe("Cholesterol");
      expect(result.biomarkers[1].flag).toBe("red");
      expect(result.summary).toContain("blood test");
    });

    it("handles markdown code block wrapped JSON", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: '```json\n{"biomarkers": [], "summary": "No results found."}\n```',
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      const result = await parseReportWithClaude("base64data", "application/pdf");

      expect(result.biomarkers).toEqual([]);
      expect(result.summary).toBe("No results found.");
    });

    it("throws on invalid JSON response", async () => {
      const mockResponse = {
        content: [{ type: "text", text: "This is not JSON" }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      await expect(
        parseReportWithClaude("base64data", "image/png")
      ).rejects.toThrow();
    });

    it("throws when response has no text block", async () => {
      const mockResponse = { content: [] };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      await expect(
        parseReportWithClaude("base64data", "image/jpeg")
      ).rejects.toThrow("No text response");
    });

    it("throws when biomarkers is not an array", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({ biomarkers: "not an array", summary: "test" }),
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const { parseReportWithClaude } = await import(
        "@/lib/claude/parse-report"
      );
      await expect(
        parseReportWithClaude("base64data", "image/jpeg")
      ).rejects.toThrow("biomarkers must be an array");
    });
  });
});
