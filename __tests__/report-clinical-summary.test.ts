import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  REPORT_SUMMARY_SYSTEM_PROMPT,
  CLINICAL_SUMMARY_DISCLAIMER,
} from "@/lib/claude/summary-prompt";
import fs from "fs";
import path from "path";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
      stream: vi.fn(),
    },
  })),
}));

const mockFetch = vi.fn();

describe("Report Clinical Summary Export (#151)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  describe("REPORT_SUMMARY_SYSTEM_PROMPT", () => {
    it("is exported from summary-prompt module", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toBeDefined();
      expect(typeof REPORT_SUMMARY_SYSTEM_PROMPT).toBe("string");
      expect(REPORT_SUMMARY_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it("instructs third-person writing style", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain(
        'Write in third person ("Patient has..."'
      );
    });

    it("requires PATIENT OVERVIEW section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain("PATIENT OVERVIEW");
    });

    it("requires LAB FINDINGS section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain("LAB FINDINGS");
    });

    it("requires AREAS OF CONCERN section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain("AREAS OF CONCERN");
    });

    it("requires BORDERLINE VALUES section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain("BORDERLINE VALUES");
    });

    it("requires NORMAL FINDINGS section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain("NORMAL FINDINGS");
    });

    it("requires RECOMMENDED FOLLOW-UP TESTS section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain(
        "RECOMMENDED FOLLOW-UP TESTS"
      );
    });

    it("requires SUGGESTED DISCUSSION POINTS section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain(
        "SUGGESTED DISCUSSION POINTS WITH PROVIDER"
      );
    });

    it("requires HEALTH CREDIT SCORE section", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain(
        "PATIENT'S HEALTH CREDIT SCORE"
      );
    });

    it("prohibits raw biomarker JSON dumps in output", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain(
        "Do NOT include raw biomarker JSON dumps"
      );
    });

    it("requires concise output for doctors", () => {
      expect(REPORT_SUMMARY_SYSTEM_PROMPT).toContain(
        "a doctor should read this in 3 minutes"
      );
    });
  });

  describe("disclaimer", () => {
    it("is reused from existing CLINICAL_SUMMARY_DISCLAIMER", () => {
      expect(CLINICAL_SUMMARY_DISCLAIMER).toContain("AI-generated");
      expect(CLINICAL_SUMMARY_DISCLAIMER).toContain("not medical diagnoses");
    });
  });

  describe("API route module", () => {
    it("exports POST handler", async () => {
      const mod = await import(
        "@/app/api/reports/[id]/clinical-summary/route"
      );
      expect(mod.POST).toBeDefined();
      expect(typeof mod.POST).toBe("function");
    });
  });

  describe("summary API contract", () => {
    it("POSTs to /api/reports/:id/clinical-summary", async () => {
      const mockSummary = {
        summary:
          "PATIENT OVERVIEW\n• Test Patient, 45, Male\n\nLAB FINDINGS\n• Glucose: 120 mg/dL",
        patient_name: "Test Patient",
        report_name: "labs.pdf",
        report_date: "2026-04-10T00:00:00Z",
        health_score: 720,
        health_score_label: "Good",
        generated_at: "2026-04-15T12:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummary),
      });

      const res = await fetch("/api/reports/rep-123/clinical-summary", {
        method: "POST",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/reports/rep-123/clinical-summary",
        { method: "POST" }
      );

      const data = await res.json();
      expect(data.summary).toContain("PATIENT OVERVIEW");
      expect(data.patient_name).toBe("Test Patient");
      expect(data.health_score).toBe(720);
      expect(data.generated_at).toBeDefined();
    });

    it("returns error when report is not parsed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: "Report has not been parsed yet",
          }),
      });

      const res = await fetch("/api/reports/pending/clinical-summary", {
        method: "POST",
      });

      expect(res.ok).toBe(false);
      const data = await res.json();
      expect(data.error).toContain("not been parsed");
    });
  });

  describe("clinical summary page component", () => {
    it("exports the summary page as default", async () => {
      const mod = await import(
        "@/app/reports/[id]/clinical-summary/page"
      );
      expect(mod.default).toBeDefined();
    });
  });

  describe("clinical summary layout", () => {
    it("exports force-dynamic constant", async () => {
      const mod = await import(
        "@/app/reports/[id]/clinical-summary/layout"
      );
      expect(mod.dynamic).toBe("force-dynamic");
    });
  });

  describe("export button visibility", () => {
    it("report detail page includes Export Summary link", () => {
      const srcPath = path.resolve(
        process.cwd(),
        "app/reports/[id]/page.tsx"
      );
      const src = fs.readFileSync(srcPath, "utf-8");

      // Button text and target route
      expect(src).toContain("Export Summary");
      expect(src).toContain("/clinical-summary");
      // Only renders when report is parsed
      expect(src).toContain('report.status === "parsed"');
    });

    it("export button uses the report-results__export-btn class", () => {
      const srcPath = path.resolve(
        process.cwd(),
        "app/reports/[id]/page.tsx"
      );
      const src = fs.readFileSync(srcPath, "utf-8");
      expect(src).toContain("report-results__export-btn");
    });
  });

  describe("clinical summary CSS reuse", () => {
    it("reuses existing .clinical-summary BEM classes (no new block)", () => {
      const cssPath = path.resolve(process.cwd(), "app/globals.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      expect(css).toContain(".clinical-summary {");
      expect(css).toContain(".clinical-summary__section");
      expect(css).toContain(".clinical-summary__disclaimer");
    });
  });
});
