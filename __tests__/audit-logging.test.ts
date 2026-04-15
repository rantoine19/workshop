import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase — use vi.hoisted to avoid hoisting issues
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

import {
  logAuditEvent,
  getClientIp,
  type AuditAction,
  type AuditResourceType,
} from "@/lib/audit/logger";

describe("Audit Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAuditEvent", () => {
    it("writes audit entry with correct fields", async () => {
      logAuditEvent({
        userId: "user-123",
        action: "report.upload",
        resourceType: "report",
        resourceId: "report-456",
        ipAddress: "192.168.1.1",
      });

      // Wait for fire-and-forget promise to resolve
      await vi.waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("audit_logs");
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        action: "report.upload",
        resource_type: "report",
        resource_id: "report-456",
        ip_address: "192.168.1.1",
      });
    });

    it("handles missing optional fields with null", async () => {
      logAuditEvent({
        userId: "user-123",
        action: "chat.message",
        resourceType: "chat_session",
      });

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-123",
        action: "chat.message",
        resource_type: "chat_session",
        resource_id: null,
        ip_address: null,
      });
    });

    it("does not throw when insert fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockInsert.mockResolvedValueOnce({
        error: { message: "DB connection failed" },
      });

      // Should not throw
      logAuditEvent({
        userId: "user-123",
        action: "report.view",
        resourceType: "report",
        resourceId: "report-789",
      });

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[AUDIT] Supabase insert error:",
          "DB connection failed"
        );
      });

      consoleSpy.mockRestore();
    });

    it("does not throw when createClient rejects", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Temporarily make createClient reject
      const { createClient } = await import("@/lib/supabase/server");
      vi.mocked(createClient).mockRejectedValueOnce(
        new Error("Connection refused")
      );

      // Should not throw
      logAuditEvent({
        userId: "user-123",
        action: "report.parse",
        resourceType: "report",
      });

      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "[AUDIT] Failed to write audit log:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it("audit entries do NOT contain PHI content", async () => {
      logAuditEvent({
        userId: "user-123",
        action: "report.upload",
        resourceType: "report",
        resourceId: "report-456",
        ipAddress: "10.0.0.1",
      });

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      const insertedData = mockInsert.mock.calls[0][0];

      // Verify the audit entry only contains metadata fields
      const allowedKeys = [
        "user_id",
        "action",
        "resource_type",
        "resource_id",
        "ip_address",
      ];
      const actualKeys = Object.keys(insertedData);
      expect(actualKeys).toEqual(expect.arrayContaining(allowedKeys));
      expect(actualKeys.length).toBe(allowedKeys.length);

      // Verify no PHI-like content fields exist
      expect(insertedData).not.toHaveProperty("content");
      expect(insertedData).not.toHaveProperty("message");
      expect(insertedData).not.toHaveProperty("file_path");
      expect(insertedData).not.toHaveProperty("biomarkers");
      expect(insertedData).not.toHaveProperty("summary");
    });

    it("supports all defined audit actions", async () => {
      const actions: AuditAction[] = [
        "report.upload",
        "report.view",
        "report.parse",
        "report.delete",
        "report.chat_upload",
        "chat.message",
        "chat.delete",
        "doctor_questions.generate",
        "medication.create",
        "medication.update",
        "medication.delete",
        "medication.photo_upload",
        "medication.photo_delete",
        "chat.export_summary",
        "insurance_card.create",
        "insurance_card.update",
        "insurance_card.delete",
        "insurance_card.view",
        "insurance_card.photo_upload",
        "insurance_card.photo_delete",
      ];

      const resourceTypes: Record<AuditAction, AuditResourceType> = {
        "report.upload": "report",
        "report.chat_upload": "report",
        "report.view": "report",
        "report.parse": "report",
        "report.delete": "report",
        "chat.message": "chat_session",
        "chat.delete": "chat_session",
        "chat.export_summary": "chat_session",
        "doctor_questions.generate": "parsed_result",
        "medication.create": "medication",
        "medication.update": "medication",
        "medication.delete": "medication",
        "medication.photo_upload": "medication",
        "medication.photo_delete": "medication",
        "insurance_card.create": "insurance_card",
        "insurance_card.update": "insurance_card",
        "insurance_card.delete": "insurance_card",
        "insurance_card.view": "insurance_card",
        "insurance_card.photo_upload": "insurance_card",
        "insurance_card.photo_delete": "insurance_card",
      };

      for (const action of actions) {
        mockInsert.mockClear();
        mockFrom.mockClear();

        logAuditEvent({
          userId: "user-123",
          action,
          resourceType: resourceTypes[action],
          resourceId: "resource-id",
        });

        await vi.waitFor(() => {
          expect(mockFrom).toHaveBeenCalledWith("audit_logs");
        });

        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            action,
            resource_type: resourceTypes[action],
          })
        );
      }
    });

    it("contains user_id, action, resource_type, resource_id in every entry", async () => {
      logAuditEvent({
        userId: "user-abc",
        action: "report.view",
        resourceType: "report",
        resourceId: "report-xyz",
        ipAddress: "172.16.0.1",
      });

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData).toHaveProperty("user_id", "user-abc");
      expect(insertedData).toHaveProperty("action", "report.view");
      expect(insertedData).toHaveProperty("resource_type", "report");
      expect(insertedData).toHaveProperty("resource_id", "report-xyz");
      // timestamp is set by Supabase default, not in the insert
    });
  });

  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
      });
      expect(getClientIp(request)).toBe("203.0.113.50");
    });

    it("extracts IP from x-real-ip header", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-real-ip": "198.51.100.78" },
      });
      expect(getClientIp(request)).toBe("198.51.100.78");
    });

    it("returns undefined when no IP headers present", () => {
      const request = new Request("http://localhost/api/test");
      expect(getClientIp(request)).toBeUndefined();
    });

    it("prefers x-forwarded-for over x-real-ip", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "203.0.113.50",
          "x-real-ip": "198.51.100.78",
        },
      });
      expect(getClientIp(request)).toBe("203.0.113.50");
    });
  });
});
