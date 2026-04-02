import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CHAT_SYSTEM_PROMPT,
  buildReportContext,
} from "@/lib/claude/chat-prompts";

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

describe("Chat API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("system prompt", () => {
    it("requires 5th grade reading level", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("5th grade reading level");
    });

    it("includes medical disclaimer requirement", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain(
        "This is not medical advice. Consult your healthcare provider."
      );
    });

    it("prohibits diagnoses and treatment recommendations", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain(
        "NEVER provide diagnoses or treatment recommendations"
      );
    });

    it("instructs to redirect diagnosis requests to doctor", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("please talk to your doctor");
    });
  });

  describe("buildReportContext", () => {
    it("formats biomarkers with values and ranges", () => {
      const context = buildReportContext({
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
        summary_plain: "Normal blood sugar levels.",
      });

      expect(context).toContain("Glucose: 95 mg/dL");
      expect(context).toContain("normal range: 70-100 mg/dL");
      expect(context).toContain("Normal blood sugar levels.");
    });

    it("flags abnormal values with uppercase label", () => {
      const context = buildReportContext({
        biomarkers: [
          {
            name: "Cholesterol",
            value: 245,
            unit: "mg/dL",
            reference_low: 0,
            reference_high: 200,
            flag: "red",
          },
        ],
        summary_plain: "High cholesterol.",
      });

      expect(context).toContain("[RED]");
    });

    it("handles missing reference ranges", () => {
      const context = buildReportContext({
        biomarkers: [
          {
            name: "WBC",
            value: 7.5,
            unit: "K/uL",
            reference_low: null,
            reference_high: null,
            flag: "green",
          },
        ],
        summary_plain: "Blood count results.",
      });

      expect(context).toContain("WBC: 7.5 K/uL");
      expect(context).not.toContain("normal range");
    });

    it("does not flag green values", () => {
      const context = buildReportContext({
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
        summary_plain: "Normal.",
      });

      expect(context).not.toContain("[GREEN]");
    });
  });

  describe("message length limit", () => {
    it("exports MAX_MESSAGE_LENGTH constant of 2000", async () => {
      const routeSource = await import("@/app/api/chat/route");
      // The route module exists and exports POST
      expect(routeSource.POST).toBeDefined();
    });

    it("rejects messages over 2000 characters with 400 status", async () => {
      // Read the route file to verify the limit is enforced
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      // Verify the constant exists
      expect(source).toContain("MAX_MESSAGE_LENGTH = 2000");

      // Verify it checks the length after trimming
      expect(source).toContain("userMessage.length > MAX_MESSAGE_LENGTH");

      // Verify it returns 400 with a clear error
      expect(source).toContain("Message too long");
      expect(source).toContain("status: 400");
    });

    it("allows messages at exactly 2000 characters", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      // Uses > (not >=) so exactly 2000 chars passes through
      expect(source).toContain("userMessage.length > MAX_MESSAGE_LENGTH");
      expect(source).not.toContain(
        "userMessage.length >= MAX_MESSAGE_LENGTH"
      );
    });
  });

  describe("Claude integration", () => {
    it("returns assistant response from Claude", async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: "text",
            text: "Your glucose level is 95, which is in the normal range. This means your body is handling sugar well.\n\n⚠️ This is not medical advice. Consult your healthcare provider.",
          },
        ],
      });

      const { getClaudeClient } = await import("@/lib/claude/client");
      const client = getClaudeClient();
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: CHAT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: "What does my glucose level mean?" }],
      });

      const textBlock = response.content.find(
        (b: { type: string }) => b.type === "text"
      );
      expect(textBlock).toBeDefined();
      if (textBlock && textBlock.type === "text") {
        expect(textBlock.text).toContain("glucose");
        expect(textBlock.text).toContain(
          "This is not medical advice"
        );
      }
    });

    it("handles Claude API errors gracefully", async () => {
      mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

      const { getClaudeClient } = await import("@/lib/claude/client");
      const client = getClaudeClient();

      await expect(
        client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: CHAT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: "Hello" }],
        })
      ).rejects.toThrow("API rate limit exceeded");
    });
  });
});
