import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Delete Report API ───────────────────────────────────────────────

describe("Delete Report API", () => {
  it("exports a DELETE handler", async () => {
    const mod = await import("@/app/api/reports/[id]/route");
    expect(mod.DELETE).toBeDefined();
    expect(typeof mod.DELETE).toBe("function");
  });
});

// ── Delete Chat Session API ─────────────────────────────────────────

describe("Delete Chat Session API", () => {
  it("exports a DELETE handler", async () => {
    const mod = await import("@/app/api/chat/sessions/[sessionId]/route");
    expect(mod.DELETE).toBeDefined();
    expect(typeof mod.DELETE).toBe("function");
  });
});

// ── Audit Actions ───────────────────────────────────────────────────

describe("Audit Actions for Delete", () => {
  // Re-mock Supabase for audit logger
  const { mockInsert, mockFrom } = vi.hoisted(() => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    return { mockInsert, mockFrom };
  });

  vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({
      from: mockFrom,
    }),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts report.delete as a valid audit action", async () => {
    const { logAuditEvent } = await import("@/lib/audit/logger");

    logAuditEvent({
      userId: "user-123",
      action: "report.delete",
      resourceType: "report",
      resourceId: "report-456",
    });

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "report.delete",
        resource_type: "report",
      })
    );
  });

  it("accepts chat.delete as a valid audit action", async () => {
    const { logAuditEvent } = await import("@/lib/audit/logger");

    logAuditEvent({
      userId: "user-123",
      action: "chat.delete",
      resourceType: "chat_session",
      resourceId: "session-789",
    });

    await vi.waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("audit_logs");
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "chat.delete",
        resource_type: "chat_session",
      })
    );
  });
});

// ── ConfirmDialog Component ─────────────────────────────────────────

describe("ConfirmDialog", () => {
  let ConfirmDialog: React.ComponentType<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/components/ui/ConfirmDialog");
    ConfirmDialog = mod.default;
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      React.createElement(ConfirmDialog, {
        isOpen: false,
        title: "Test",
        message: "Test message",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      })
    );
    expect(container.querySelector(".confirm-dialog")).toBeNull();
  });

  it("renders dialog when isOpen is true", () => {
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Delete Report",
        message: "Are you sure?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    expect(screen.getByText("Delete Report")).toBeDefined();
    expect(screen.getByText("Are you sure?")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Confirm Deletion",
        message: "Sure?",
        onConfirm,
        onCancel: vi.fn(),
      })
    );

    fireEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Confirm Deletion",
        message: "Sure?",
        onConfirm: vi.fn(),
        onCancel,
      })
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop is clicked", () => {
    const onCancel = vi.fn();
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Confirm Deletion",
        message: "Sure?",
        onConfirm: vi.fn(),
        onCancel,
      })
    );

    const backdrop = document.querySelector(
      "[data-testid='confirm-dialog-backdrop']"
    );
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Escape key is pressed", () => {
    const onCancel = vi.fn();
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Confirm Deletion",
        message: "Sure?",
        onConfirm: vi.fn(),
        onCancel,
      })
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("uses custom confirmLabel when provided", () => {
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Remove",
        message: "Sure?",
        confirmLabel: "Remove Forever",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    expect(screen.getByText("Remove Forever")).toBeDefined();
  });

  it("has correct aria attributes for accessibility", () => {
    render(
      React.createElement(ConfirmDialog, {
        isOpen: true,
        title: "Confirm Deletion",
        message: "Are you sure?",
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-labelledby")).toBe(
      "confirm-dialog-title"
    );
    expect(dialog?.getAttribute("aria-describedby")).toBe(
      "confirm-dialog-message"
    );
  });
});

// ── Report Detail Page Delete ───────────────────────────────────────

describe("Report Detail Page Delete Button", () => {
  const mockFetch = vi.fn();

  const profileResponse = {
    ok: true,
    json: async () => ({
      profile: {
        id: "user-1",
        display_name: null,
        avatar_url: null,
        updated_at: null,
      },
    }),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (input: string | URL | Request, ...args: unknown[]) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url === "/api/profile") {
          return Promise.resolve(profileResponse as Response);
        }
        return mockFetch(input, ...args);
      }
    );

    vi.doMock("next/navigation", () => ({
      useParams: () => ({ id: "report-abc" }),
      usePathname: () => "/reports/report-abc",
      useRouter: () => ({ push: vi.fn() }),
    }));
  });

  it("renders delete button on report detail page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        report: {
          id: "report-abc",
          file_name: "blood-test.pdf",
          file_type: "pdf",
          status: "parsed",
          created_at: "2026-04-01T10:00:00Z",
          parsed_result_id: "pr-1",
        },
      }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(screen.getByText("blood-test.pdf")).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText("Delete report");
    expect(deleteBtn).toBeDefined();
  });

  it("shows confirm dialog when delete button is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        report: {
          id: "report-abc",
          file_name: "blood-test.pdf",
          file_type: "pdf",
          status: "parsed",
          created_at: "2026-04-01T10:00:00Z",
          parsed_result_id: "pr-1",
        },
      }),
    });

    const { default: ReportResultsPage } = await import(
      "@/app/reports/[id]/page"
    );
    render(React.createElement(ReportResultsPage));

    await waitFor(() => {
      expect(screen.getByText("blood-test.pdf")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("Delete report"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Are you sure? This will permanently delete this report and all its analysis data."
        )
      ).toBeDefined();
    });

    // Dialog title "Delete Report" present
    expect(screen.getByText("Delete Report")).toBeDefined();
    // Multiple "Delete" texts present (button + confirm dialog)
    const deleteTexts = screen.getAllByText("Delete");
    expect(deleteTexts.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Chat Sidebar Delete ─────────────────────────────────────────────

describe("Chat Sidebar Delete", () => {
  it("exports ChatSidebar component", async () => {
    const mod = await import("@/components/chat/ChatSidebar");
    expect(mod.ChatSidebar).toBeDefined();
  });
});
