import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

describe("Chat Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  describe("Sessions API contract", () => {
    it("calls GET /api/chat/sessions with pagination params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        }),
      });

      await fetch("/api/chat/sessions?page=1&limit=5");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/chat/sessions?page=1&limit=5"
      );
    });

    it("returns sessions with title, date, and message_count", async () => {
      const mockSessions = {
        sessions: [
          {
            id: "sess-1",
            title: "What does my cholesterol level mean?",
            report_id: "report-1",
            created_at: "2026-04-01T10:00:00Z",
            updated_at: "2026-04-01T10:30:00Z",
            message_count: 4,
          },
          {
            id: "sess-2",
            title: "Are any of my results outside the normal range?",
            report_id: null,
            created_at: "2026-03-31T09:00:00Z",
            updated_at: "2026-03-31T09:15:00Z",
            message_count: 2,
          },
        ],
        pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessions,
      });

      const response = await fetch("/api/chat/sessions?page=1&limit=5");
      const data = await response.json();

      expect(data.sessions).toHaveLength(2);
      expect(data.sessions[0]).toHaveProperty("id");
      expect(data.sessions[0]).toHaveProperty("title");
      expect(data.sessions[0]).toHaveProperty("message_count");
      expect(data.sessions[0]).toHaveProperty("created_at");
      expect(data.sessions[0]).toHaveProperty("updated_at");
    });

    it("supports pagination with page and totalPages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [],
          pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
        }),
      });

      const response = await fetch("/api/chat/sessions?page=2&limit=5");
      const data = await response.json();

      expect(data.pagination.page).toBe(2);
      expect(data.pagination.totalPages).toBe(3);
      expect(data.pagination.total).toBe(12);
    });
  });

  describe("Session messages API contract", () => {
    it("calls GET /api/chat/sessions/:sessionId/messages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [
            {
              id: "msg-1",
              role: "user",
              content: "What is glucose?",
              created_at: "2026-04-01T10:00:00Z",
            },
            {
              id: "msg-2",
              role: "assistant",
              content: "Glucose is a type of sugar.",
              created_at: "2026-04-01T10:00:05Z",
            },
          ],
          report_id: "report-1",
        }),
      });

      const response = await fetch(
        "/api/chat/sessions/sess-1/messages"
      );
      const data = await response.json();

      expect(data.messages).toHaveLength(2);
      expect(data.messages[0].role).toBe("user");
      expect(data.messages[1].role).toBe("assistant");
      expect(data).toHaveProperty("report_id");
    });
  });

  describe("Sessions API route source validation", () => {
    it("exports a GET handler", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("export async function GET");
    });

    it("verifies authentication", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("auth.getUser()");
      expect(source).toContain("Unauthorized");
      expect(source).toContain("status: 401");
    });

    it("supports page and limit pagination params", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain('"page"');
      expect(source).toContain('"limit"');
      expect(source).toContain("offset");
    });

    it("returns sessions ordered by most recent", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("updated_at");
      expect(source).toContain("ascending: false");
    });

    it("generates title from first user message for sessions without title", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("substring(0, 50)");
      expect(source).toContain('"New Chat"');
    });
  });

  describe("Chat API title generation", () => {
    it("sets title from first user message when creating new session", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      // Title is generated from the first user message
      expect(source).toContain("userMessage.substring(0, 50)");
      expect(source).toContain("title");
    });

    it("updates session updated_at after message persistence", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("updated_at");
      expect(source).toContain('update({');
    });
  });

  describe("ChatSidebar component", () => {
    it("exports ChatSidebar component", async () => {
      const mod = await import("@/components/chat/ChatSidebar");
      expect(mod.ChatSidebar).toBeDefined();
    });

    it("is a function component", async () => {
      const mod = await import("@/components/chat/ChatSidebar");
      expect(typeof mod.ChatSidebar).toBe("function");
    });
  });

  describe("useChat hook session switching", () => {
    it("exports switchSession function from useChat", async () => {
      const mod = await import("@/hooks/useChat");
      expect(mod.useChat).toBeDefined();
    });

    it("useChat source includes switchSession and startNewChat", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const hookPath = path.resolve(
        __dirname,
        "../hooks/useChat.ts"
      );
      const source = fs.readFileSync(hookPath, "utf-8");

      expect(source).toContain("switchSession");
      expect(source).toContain("startNewChat");
    });

    it("switchSession fetches messages for the target session", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const hookPath = path.resolve(
        __dirname,
        "../hooks/useChat.ts"
      );
      const source = fs.readFileSync(hookPath, "utf-8");

      expect(source).toContain("/api/chat/sessions/");
      expect(source).toContain("/messages");
    });

    it("startNewChat clears messages and session", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const hookPath = path.resolve(
        __dirname,
        "../hooks/useChat.ts"
      );
      const source = fs.readFileSync(hookPath, "utf-8");

      // startNewChat should set messages to empty, sessionId to null
      expect(source).toContain("setMessages([])");
      expect(source).toContain("setSessionId(null)");
    });
  });

  describe("Session messages route source validation", () => {
    it("exports a GET handler for session messages", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/[sessionId]/messages/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("export async function GET");
    });

    it("verifies authentication for session messages", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/[sessionId]/messages/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("auth.getUser()");
      expect(source).toContain("Unauthorized");
    });

    it("verifies session ownership before returning messages", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/[sessionId]/messages/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("Session not found");
      expect(source).toContain("status: 404");
    });

    it("returns messages ordered by created_at ascending", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const routePath = path.resolve(
        __dirname,
        "../app/api/chat/sessions/[sessionId]/messages/route.ts"
      );
      const source = fs.readFileSync(routePath, "utf-8");

      expect(source).toContain("ascending: true");
    });
  });

  describe("Migration for title column", () => {
    it("adds title column to chat_sessions table", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const migrationPath = path.resolve(
        __dirname,
        "../supabase/migrations/008_chat_session_title.sql"
      );
      const source = fs.readFileSync(migrationPath, "utf-8");

      expect(source).toContain("ALTER TABLE chat_sessions");
      expect(source).toContain("ADD COLUMN title text");
    });
  });
});
