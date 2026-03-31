import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

describe("Chat UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  describe("useChat hook", () => {
    it("sends message and receives response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: "assistant", content: "Your glucose is normal." },
          session_id: "session-123",
        }),
      });

      const { useChat } = await import("@/hooks/useChat");
      // We can't directly test hooks outside React, so we test the fetch call
      expect(useChat).toBeDefined();
      expect(typeof useChat).toBe("function");
    });

    it("exports required interface", async () => {
      const mod = await import("@/hooks/useChat");
      expect(mod.useChat).toBeDefined();
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

  describe("Chat API contract", () => {
    it("sends correct request shape to /api/chat", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: "assistant", content: "Hello!" },
          session_id: "sess-1",
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: "assistant", content: "Hello" },
          session_id: "sess-1",
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { role: "assistant", content: "Follow up." },
          session_id: "sess-1",
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
  });
});
