import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildMultiReportContext,
  buildReportContext,
} from "@/lib/claude/chat-prompts";
import type { MultiReportData } from "@/lib/claude/chat-prompts";
import type { ParsedReportResult } from "@/lib/claude/parse-report";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
      stream: vi.fn(),
    },
  })),
}));

describe("Chat Upload API", () => {
  describe("chat/upload route structure", () => {
    it("exports a POST handler", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/upload/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("export async function POST");
    });

    it("validates authentication", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/upload/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("supabase.auth.getUser()");
      expect(source).toContain("Unauthorized");
    });

    it("uses same validation as main upload", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/upload/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("validateFile");
      expect(source).toContain("validateFileContent");
      expect(source).toContain("uploadToStorage");
    });

    it("creates a report record", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/upload/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain('.from("reports")');
      expect(source).toContain(".insert(");
    });

    it("returns report_id on success", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/upload/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("report_id: report.id");
      expect(source).toContain("status: 201");
    });

    it("logs audit event for chat upload", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/upload/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("logAuditEvent");
      expect(source).toContain("report.chat_upload");
    });
  });
});

describe("Report date extraction", () => {
  describe("parse prompt includes report_date", () => {
    it("includes report_date field in extraction prompt", async () => {
      const { PARSE_REPORT_SYSTEM_PROMPT } = await import(
        "@/lib/claude/prompts"
      );
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("report_date");
      expect(PARSE_REPORT_SYSTEM_PROMPT).toContain("YYYY-MM-DD");
    });
  });

  describe("ParsedReportResult includes report_date", () => {
    it("accepts report_date in parsed result", () => {
      const result: ParsedReportResult = {
        biomarkers: [
          {
            name: "Glucose",
            value: 95,
            unit: "mg/dL",
            reference_low: 70,
            reference_high: 100,
            flag: "green",
          },
        ],
        summary: "Normal blood work.",
        report_date: "2024-03-15",
      };

      expect(result.report_date).toBe("2024-03-15");
    });

    it("accepts null report_date", () => {
      const result: ParsedReportResult = {
        biomarkers: [],
        summary: "No data.",
        report_date: null,
      };

      expect(result.report_date).toBeNull();
    });
  });

  describe("parse route saves report_date", () => {
    it("updates report with extracted report_date", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/parse/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("report_date");
      expect(source).toContain("parsed.report_date");
    });
  });
});

describe("Multi-report context", () => {
  describe("buildMultiReportContext", () => {
    it("returns empty string for no reports", () => {
      const result = buildMultiReportContext([]);
      expect(result).toBe("");
    });

    it("includes report filename and date", () => {
      const reports: MultiReportData[] = [
        {
          filename: "bloodwork_march.pdf",
          report_date: "2024-03-15",
          created_at: "2024-03-16T10:00:00Z",
          biomarkers: [
            { name: "Glucose", value: 95, unit: "mg/dL", flag: "green" },
          ],
          summary_plain: "Normal blood sugar.",
        },
      ];

      const result = buildMultiReportContext(reports);
      expect(result).toContain("bloodwork_march.pdf");
      expect(result).toContain("2024-03-15");
      expect(result).toContain("Glucose: 95 mg/dL");
    });

    it("falls back to upload date when report_date is null", () => {
      const reports: MultiReportData[] = [
        {
          filename: "scan.png",
          report_date: null,
          created_at: "2024-04-01T10:00:00Z",
          biomarkers: [],
          summary_plain: "Scan results.",
        },
      ];

      const result = buildMultiReportContext(reports);
      expect(result).toContain("uploaded 2024-04-01");
    });

    it("includes flagged biomarkers with uppercase label", () => {
      const reports: MultiReportData[] = [
        {
          filename: "test.pdf",
          report_date: "2024-01-01",
          created_at: "2024-01-02T00:00:00Z",
          biomarkers: [
            { name: "LDL", value: 190, unit: "mg/dL", flag: "red" },
          ],
          summary_plain: "High LDL.",
        },
      ];

      const result = buildMultiReportContext(reports);
      expect(result).toContain("[RED]");
    });

    it("does not flag green biomarkers", () => {
      const reports: MultiReportData[] = [
        {
          filename: "test.pdf",
          report_date: "2024-01-01",
          created_at: "2024-01-02T00:00:00Z",
          biomarkers: [
            { name: "Glucose", value: 90, unit: "mg/dL", flag: "green" },
          ],
          summary_plain: "Normal.",
        },
      ];

      const result = buildMultiReportContext(reports);
      expect(result).not.toContain("[GREEN]");
    });

    it("handles multiple reports with date-aware context", () => {
      const reports: MultiReportData[] = [
        {
          filename: "march_labs.pdf",
          report_date: "2024-03-15",
          created_at: "2024-03-16T00:00:00Z",
          biomarkers: [
            { name: "Glucose", value: 95, unit: "mg/dL", flag: "green" },
          ],
          summary_plain: "March blood work.",
        },
        {
          filename: "june_labs.pdf",
          report_date: "2024-06-10",
          created_at: "2024-06-11T00:00:00Z",
          biomarkers: [
            { name: "Glucose", value: 110, unit: "mg/dL", flag: "yellow" },
          ],
          summary_plain: "June blood work.",
        },
      ];

      const result = buildMultiReportContext(reports);
      expect(result).toContain("march_labs.pdf");
      expect(result).toContain("june_labs.pdf");
      expect(result).toContain("2024-03-15");
      expect(result).toContain("2024-06-10");
      expect(result).toContain("compare values across reports");
    });

    it("truncates when context exceeds max length", () => {
      // Create a very large report to trigger truncation
      const bigBiomarkers = Array.from({ length: 500 }, (_, i) => ({
        name: `Biomarker_${i}_with_a_very_long_name_for_testing`,
        value: i * 10,
        unit: "mg/dL",
        flag: "green" as const,
      }));

      const reports: MultiReportData[] = [
        {
          filename: "huge_report.pdf",
          report_date: "2024-01-01",
          created_at: "2024-01-02T00:00:00Z",
          biomarkers: bigBiomarkers,
          summary_plain: "A very large report with many biomarkers.",
        },
      ];

      const result = buildMultiReportContext(reports);
      expect(result).toContain("[...truncated]");
    });
  });

  describe("chat route multi-report loading", () => {
    it("loads multi-report context when no report_id", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("buildMultiReportContext");
      expect(source).toContain("Multi-report context");
      expect(source).toContain(".limit(5)");
    });

    it("still supports single-report context with report_id", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("buildReportContext");
      expect(source).toContain("Single-report context");
    });
  });
});

describe("ChatInput file upload UI", () => {
  it("exports ChatInput component", async () => {
    const mod = await import("@/components/chat/ChatInput");
    expect(mod.ChatInput).toBeDefined();
  });

  it("includes attach button with paperclip icon", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(
      __dirname,
      "../components/chat/ChatInput.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf-8");

    expect(source).toContain("chat-input__attach-btn");
    expect(source).toContain('aria-label="Attach file"');
    expect(source).toContain("svg");
  });

  it("has hidden file input for PDF/PNG/JPG", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(
      __dirname,
      "../components/chat/ChatInput.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf-8");

    expect(source).toContain('accept=".pdf,.png,.jpg,.jpeg"');
    expect(source).toContain("chat-input__file-hidden");
  });

  it("has file preview with upload and remove buttons", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(
      __dirname,
      "../components/chat/ChatInput.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf-8");

    expect(source).toContain("chat-input__file-preview");
    expect(source).toContain("chat-input__file-preview-upload");
    expect(source).toContain("chat-input__file-preview-remove");
  });

  it("has upload progress indicator", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(
      __dirname,
      "../components/chat/ChatInput.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf-8");

    expect(source).toContain("chat-input__upload-progress");
    expect(source).toContain("Uploading");
    expect(source).toContain("Analyzing");
  });

  it("supports onFileUpload callback prop", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(
      __dirname,
      "../components/chat/ChatInput.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf-8");

    expect(source).toContain("onFileUpload");
  });
});
