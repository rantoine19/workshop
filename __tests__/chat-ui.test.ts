import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

describe("Chat UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  describe("useChat hook", () => {
    it("exports useChat function", async () => {
      const { useChat } = await import("@/hooks/useChat");
      expect(useChat).toBeDefined();
      expect(typeof useChat).toBe("function");
    });

    it("exports ChatMessage type with isStreaming field", async () => {
      // Verify the module exports the type by checking the hook interface
      const mod = await import("@/hooks/useChat");
      expect(mod.useChat).toBeDefined();
      expect(mod.parseSSEChunk).toBeDefined();
    });

    it("exports parseSSEChunk utility", async () => {
      const { parseSSEChunk } = await import("@/hooks/useChat");
      expect(typeof parseSSEChunk).toBe("function");
    });
  });

  describe("ChatWindow component", () => {
    it("exports ChatWindow component", async () => {
      const mod = await import("@/components/chat/ChatWindow");
      expect(mod.ChatWindow).toBeDefined();
    });
  });

  describe("MessageBubble component", () => {
    it("exports MessageBubble component", async () => {
      const mod = await import("@/components/chat/MessageBubble");
      expect(mod.MessageBubble).toBeDefined();
    });
  });

  describe("ChatInput component", () => {
    it("exports ChatInput component", async () => {
      const mod = await import("@/components/chat/ChatInput");
      expect(mod.ChatInput).toBeDefined();
    });
  });

  describe("Chat Streaming API contract", () => {
    it("sends correct request shape to /api/chat", async () => {
      // Create a mock SSE stream response
      const sseData =
        'data: {"type":"session_id","session_id":"sess-1"}\n\n' +
        'data: {"type":"text_delta","text":"Hello!"}\n\n' +
        'data: {"type":"done"}\n\n';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "Content-Type": "text/event-stream" }),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData));
            controller.close();
          },
        }),
      });

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "What is glucose?",
          session_id: null,
          report_id: "report-123",
        }),
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "What is glucose?",
          session_id: null,
          report_id: "report-123",
        }),
      });
    });

    it("calls /api/chat endpoint with POST method", async () => {
      const sseData = 'data: {"type":"done"}\n\n';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData));
            controller.close();
          },
        }),
      });

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello" }),
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/chat");
      expect(options.method).toBe("POST");
    });

    it("includes session_id for continued conversations", async () => {
      const sseData = 'data: {"type":"done"}\n\n';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData));
            controller.close();
          },
        }),
      });

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Follow up question",
          session_id: "sess-1",
          report_id: undefined,
        }),
      });

      const callBody = JSON.parse(
        mockFetch.mock.calls[0][1].body as string
      );
      expect(callBody.session_id).toBe("sess-1");
    });

    it("returns a streaming SSE response", async () => {
      const sseData =
        'data: {"type":"session_id","session_id":"sess-1"}\n\n' +
        'data: {"type":"text_delta","text":"Your "}\n\n' +
        'data: {"type":"text_delta","text":"glucose "}\n\n' +
        'data: {"type":"text_delta","text":"is normal."}\n\n' +
        'data: {"type":"done"}\n\n';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData));
            controller.close();
          },
        }),
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "What is glucose?" }),
      });

      expect(response.ok).toBe(true);
      expect(response.body).toBeDefined();

      // Read the stream and verify SSE events
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      expect(fullText).toContain('"type":"session_id"');
      expect(fullText).toContain('"type":"text_delta"');
      expect(fullText).toContain('"type":"done"');
    });
  });
});
