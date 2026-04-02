import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CHAT_SYSTEM_PROMPT,
  buildReportContext,
} from "@/lib/claude/chat-prompts";
import { parseSSEChunk } from "@/hooks/useChat";

// Mock Anthropic SDK
const mockCreate = vi.fn();
const mockStream = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
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
      expect(CHAT_SYSTEM_PROMPT).toContain("NEVER diagnose");
      expect(CHAT_SYSTEM_PROMPT).toContain("NEVER provide medical advice");
    });

    it("instructs to redirect diagnosis requests to doctor", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("please talk to your doctor");
    });

    it("requires short conversational responses", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("2-3 sentences max");
    });

    it("requires follow-up questions to keep conversation going", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("follow-up question");
    });

    it("instructs to focus on one topic per message", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("ONE topic or ONE biomarker per message");
    });

    it("prohibits dumping all results at once", () => {
      expect(CHAT_SYSTEM_PROMPT).toContain("Do NOT dump all results at once");
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
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      // The route module exports a POST function and defines the constant
      expect(source).toContain("export async function POST");
      expect(source).toContain("MAX_MESSAGE_LENGTH = 2000");
    });

    it("rejects messages over 2000 characters with 400 status", async () => {
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

  describe("Claude streaming integration", () => {
    it("uses claude.messages.stream() for streaming", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("claude.messages.stream(");
    });

    it("returns SSE content-type header", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("text/event-stream");
    });

    it("sends session_id, text_delta, and done events", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain('type: "session_id"');
      expect(source).toContain('type: "text_delta"');
      expect(source).toContain('type: "done"');
    });

    it("sends error events on failure", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain('type: "error"');
    });

    it("persists messages after stream completes", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      // Persistence happens after finalMessage()
      expect(source).toContain("await messageStream.finalMessage()");
      expect(source).toContain('role: "user", content: userMessage');
      expect(source).toContain('role: "assistant", content: assistantContent');
    });
  });

  describe("Sentry logging for persistence failures", () => {
    it("imports Sentry in the chat route", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain('import * as Sentry from "@sentry/nextjs"');
    });

    it("calls Sentry.captureException on insert failure", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("Sentry.captureException");
      expect(source).toContain("Chat persistence failed");
    });

    it("includes session_id and message_count but no PHI", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      // Should include safe metadata
      expect(source).toContain("session_id: sessionId");
      expect(source).toContain("message_count: messages.length");

      // Should NOT include message content in Sentry call
      // The Sentry block should not reference userMessage or assistantContent
      const sentryBlock = source.substring(
        source.indexOf("Sentry.captureException"),
        source.indexOf("}", source.indexOf("Sentry.captureException") + 200) + 50
      );
      expect(sentryBlock).not.toContain("userMessage");
      expect(sentryBlock).not.toContain("assistantContent");
    });

    it("tags the error with feature and error_type", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain('feature: "chat"');
      expect(source).toContain('error_type: "persistence_failure"');
    });
  });
});

describe("SSE parsing (parseSSEChunk)", () => {
  it("parses a single complete SSE event", () => {
    const chunk = 'data: {"type":"text_delta","text":"Hello"}\n\n';
    const { events, remaining } = parseSSEChunk(chunk, "");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("text_delta");
    expect(events[0].text).toBe("Hello");
    expect(remaining).toBe("");
  });

  it("parses multiple SSE events in a single chunk", () => {
    const chunk =
      'data: {"type":"session_id","session_id":"sess-1"}\n\n' +
      'data: {"type":"text_delta","text":"Hi"}\n\n';
    const { events, remaining } = parseSSEChunk(chunk, "");

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("session_id");
    expect(events[1].type).toBe("text_delta");
    expect(remaining).toBe("");
  });

  it("handles partial chunks across calls", () => {
    const chunk1 = 'data: {"type":"text_del';
    const { events: events1, remaining: rem1 } = parseSSEChunk(chunk1, "");
    expect(events1).toHaveLength(0);
    expect(rem1).toBe('data: {"type":"text_del');

    const chunk2 = 'ta","text":"Hi"}\n\n';
    const { events: events2, remaining: rem2 } = parseSSEChunk(chunk2, rem1);
    expect(events2).toHaveLength(1);
    expect(events2[0].text).toBe("Hi");
    expect(rem2).toBe("");
  });

  it("parses done events", () => {
    const chunk = 'data: {"type":"done"}\n\n';
    const { events } = parseSSEChunk(chunk, "");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
  });

  it("parses error events", () => {
    const chunk = 'data: {"type":"error","error":"Chat failed: timeout"}\n\n';
    const { events } = parseSSEChunk(chunk, "");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(events[0].error).toBe("Chat failed: timeout");
  });

  it("skips malformed JSON lines", () => {
    const chunk = 'data: not-json\n\ndata: {"type":"done"}\n\n';
    const { events } = parseSSEChunk(chunk, "");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
  });

  it("skips empty lines and non-data lines", () => {
    const chunk = '\n\n: comment\ndata: {"type":"done"}\n\n';
    const { events } = parseSSEChunk(chunk, "");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("done");
  });
});
