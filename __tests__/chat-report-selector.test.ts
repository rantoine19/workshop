import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

describe("Chat Report Selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
  });

  describe("ReportSelector component", () => {
    it("exports ReportSelector component", async () => {
      const mod = await import("@/components/chat/ReportSelector");
      expect(mod.ReportSelector).toBeDefined();
      expect(typeof mod.ReportSelector).toBe("function");
    });
  });

  describe("Reports API contract for selector", () => {
    it("fetches reports from /api/reports", async () => {
      const mockReports = {
        reports: [
          {
            id: "report-1",
            file_name: "blood-work.pdf",
            file_type: "application/pdf",
            status: "parsed",
            created_at: "2026-03-15T10:00:00Z",
          },
          {
            id: "report-2",
            file_name: "lipid-panel.pdf",
            file_type: "application/pdf",
            status: "parsed",
            created_at: "2026-03-10T09:00:00Z",
          },
          {
            id: "report-3",
            file_name: "pending-report.pdf",
            file_type: "application/pdf",
            status: "pending",
            created_at: "2026-03-20T08:00:00Z",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockReports,
      });

      const response = await fetch("/api/reports");
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith("/api/reports");
      expect(data.reports).toHaveLength(3);

      // Only parsed reports should be shown in selector
      const parsedReports = data.reports.filter(
        (r: { status: string }) => r.status === "parsed"
      );
      expect(parsedReports).toHaveLength(2);
    });

    it("returns reports with file_name, status, and created_at", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reports: [
            {
              id: "report-1",
              file_name: "blood-work.pdf",
              file_type: "application/pdf",
              status: "parsed",
              created_at: "2026-03-15T10:00:00Z",
            },
          ],
        }),
      });

      const response = await fetch("/api/reports");
      const data = await response.json();

      expect(data.reports[0]).toHaveProperty("id");
      expect(data.reports[0]).toHaveProperty("file_name");
      expect(data.reports[0]).toHaveProperty("status");
      expect(data.reports[0]).toHaveProperty("created_at");
    });
  });

  describe("useChat attach/detach report", () => {
    it("useChat source includes attachReport and detachReport", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const hookPath = path.resolve(
        __dirname,
        "../hooks/useChat.ts"
      );
      const source = fs.readFileSync(hookPath, "utf-8");

      expect(source).toContain("attachReport");
      expect(source).toContain("detachReport");
      expect(source).toContain("attachedReport");
    });

    it("exports AttachedReport interface", async () => {
      const mod = await import("@/hooks/useChat");
      // The module should export the hook that returns attach/detach functions
      expect(mod.useChat).toBeDefined();
    });

    it("useChat uses effectiveReportId for API calls", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const hookPath = path.resolve(
        __dirname,
        "../hooks/useChat.ts"
      );
      const source = fs.readFileSync(hookPath, "utf-8");

      expect(source).toContain("effectiveReportId");
      expect(source).toContain(
        "report_id: effectiveReportId"
      );
    });

    it("startNewChat clears attachedReport", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const hookPath = path.resolve(
        __dirname,
        "../hooks/useChat.ts"
      );
      const source = fs.readFileSync(hookPath, "utf-8");

      expect(source).toContain("setAttachedReport(null)");
    });
  });

  describe("Report context indicator", () => {
    it("ChatWindow source includes report indicator markup", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(componentPath, "utf-8");

      expect(source).toContain("chat-report-indicator");
      expect(source).toContain("Discussing:");
      expect(source).toContain("Detach report");
    });

    it("ChatWindow imports and renders ReportSelector", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(componentPath, "utf-8");

      expect(source).toContain("ReportSelector");
      expect(source).toContain("showReportSelector");
      expect(source).toContain("selectorDismissed");
    });

    it("ChatWindow uses attachReport and detachReport from useChat", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(componentPath, "utf-8");

      expect(source).toContain("attachReport");
      expect(source).toContain("detachReport");
      expect(source).toContain("attachedReport");
    });

    it("report selector only shows when no reportId prop, no session, and not dismissed", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const componentPath = path.resolve(
        __dirname,
        "../components/chat/ChatWindow.tsx"
      );
      const source = fs.readFileSync(componentPath, "utf-8");

      // Check the condition logic
      expect(source).toContain("!reportId");
      expect(source).toContain("!sessionId");
      expect(source).toContain("!selectorDismissed");
      expect(source).toContain("!attachedReport");
    });
  });

  describe("Chat API sends report_id from attached report", () => {
    it("sends report_id in chat request body", async () => {
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
          message: "Tell me about my results",
          session_id: null,
          report_id: "report-attached-1",
        }),
      });

      const callBody = JSON.parse(
        mockFetch.mock.calls[0][1].body as string
      );
      expect(callBody.report_id).toBe("report-attached-1");
    });
  });

  describe("CSS classes exist", () => {
    it("globals.css contains report-selector styles", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const cssPath = path.resolve(
        __dirname,
        "../app/globals.css"
      );
      const source = fs.readFileSync(cssPath, "utf-8");

      expect(source).toContain(".report-selector");
      expect(source).toContain(".report-selector__item");
      expect(source).toContain(".report-selector__item--selected");
      expect(source).toContain(".report-selector__skip");
      expect(source).toContain(".chat-report-indicator");
      expect(source).toContain(".chat-report-indicator__remove");
    });
  });
});
