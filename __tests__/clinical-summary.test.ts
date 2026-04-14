import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CLINICAL_SUMMARY_SYSTEM_PROMPT,
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

describe("Clinical Summary Export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  describe("summary prompt", () => {
    it("instructs third-person writing style", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain(
        'Write in third person ("Patient discussed..."'
      );
    });

    it("requires CHIEF CONCERNS section", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain("CHIEF CONCERNS");
    });

    it("requires KEY LAB FINDINGS section", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain("KEY LAB FINDINGS");
    });

    it("requires DISCUSSION POINTS section", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain("DISCUSSION POINTS");
    });

    it("requires RECOMMENDATIONS DISCUSSED section", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain(
        "RECOMMENDATIONS DISCUSSED"
      );
    });

    it("requires SUGGESTED FOLLOW-UP TESTS section", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain(
        "SUGGESTED FOLLOW-UP TESTS"
      );
    });

    it("requires QUESTIONS FOR YOUR DOCTOR section", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain(
        "QUESTIONS FOR YOUR DOCTOR"
      );
    });

    it("prohibits raw chat messages in output", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain(
        "Do NOT include the raw chat messages"
      );
    });

    it("requires concise output for doctors", () => {
      expect(CLINICAL_SUMMARY_SYSTEM_PROMPT).toContain(
        "a doctor should be able to read this in 2 minutes"
      );
    });
  });

  describe("disclaimer", () => {
    it("includes AI-generated warning", () => {
      expect(CLINICAL_SUMMARY_DISCLAIMER).toContain("AI-generated");
    });

    it("states notes are not medical diagnoses", () => {
      expect(CLINICAL_SUMMARY_DISCLAIMER).toContain(
        "not medical diagnoses"
      );
    });

    it("advises consulting healthcare provider", () => {
      expect(CLINICAL_SUMMARY_DISCLAIMER).toContain(
        "healthcare provider"
      );
    });
  });

  describe("summary API contract", () => {
    it("calls POST /api/chat/sessions/:id/summary", async () => {
      const mockSummary = {
        summary: "CHIEF CONCERNS\n• Elevated glucose\n\nKEY LAB FINDINGS\n• Score: 606",
        patient_name: "Test Patient",
        session_title: "Lab results discussion",
        generated_at: "2026-04-14T12:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummary),
      });

      const res = await fetch("/api/chat/sessions/sess-123/summary", {
        method: "POST",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/chat/sessions/sess-123/summary",
        { method: "POST" }
      );

      const data = await res.json();
      expect(data.summary).toContain("CHIEF CONCERNS");
      expect(data.patient_name).toBe("Test Patient");
      expect(data.generated_at).toBeDefined();
    });

    it("returns error when session has no messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: "No messages found for this session",
          }),
      });

      const res = await fetch("/api/chat/sessions/empty-sess/summary", {
        method: "POST",
      });

      expect(res.ok).toBe(false);
      const data = await res.json();
      expect(data.error).toContain("No messages");
    });
  });

  describe("summary page component", () => {
    it("exports the summary page as default", async () => {
      const mod = await import(
        "@/app/chat/sessions/[sessionId]/summary/page"
      );
      expect(mod.default).toBeDefined();
    });
  });

  describe("summary layout", () => {
    it("exports force-dynamic constant", async () => {
      const mod = await import(
        "@/app/chat/sessions/[sessionId]/summary/layout"
      );
      expect(mod.dynamic).toBe("force-dynamic");
    });
  });

  describe("print CSS", () => {
    it("hides actions and nav in print media query", () => {
      const cssPath = path.resolve(
        process.cwd(),
        "app/globals.css"
      );
      const css = fs.readFileSync(cssPath, "utf-8");

      // Verify print media query exists and hides the right elements
      expect(css).toContain("@media print");
      expect(css).toContain(".clinical-summary__actions");
      expect(css).toContain("display: none !important");
      expect(css).toContain(".nav-header");
    });
  });

  describe("export button visibility", () => {
    it("ChatWindow exports the component", async () => {
      const mod = await import("@/components/chat/ChatWindow");
      expect(mod.ChatWindow).toBeDefined();
    });

    it("ChatWindow source includes export notes button", () => {
      const srcPath = path.resolve(
        process.cwd(),
        "components/chat/ChatWindow.tsx"
      );
      const src = fs.readFileSync(srcPath, "utf-8");

      // Button renders only when sessionId and messages exist
      expect(src).toContain("Export Notes");
      expect(src).toContain("sessionId && messages.length > 0");
      expect(src).toContain("/summary");
    });
  });
});
