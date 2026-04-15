import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "report.upload"
  | "report.chat_upload"
  | "report.view"
  | "report.parse"
  | "report.delete"
  | "chat.message"
  | "chat.delete"
  | "chat.export_summary"
  | "doctor_questions.generate"
  | "medication.create"
  | "medication.update"
  | "medication.delete"
  | "medication.photo_upload"
  | "medication.photo_delete"
  | "insurance_card.create"
  | "insurance_card.update"
  | "insurance_card.delete"
  | "insurance_card.view"
  | "insurance_card.photo_upload"
  | "insurance_card.photo_delete";

export type AuditResourceType =
  | "report"
  | "chat_session"
  | "parsed_result"
  | "medication"
  | "insurance_card";

interface AuditEvent {
  userId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  ipAddress?: string;
}

/**
 * Log an audit event for PHI access tracking (HIPAA requirement).
 *
 * Fire-and-forget: this function never throws and never blocks the request.
 * If the audit log write fails, the error is logged to console but the
 * calling request continues normally.
 *
 * IMPORTANT: Never include actual PHI data in audit log entries —
 * only metadata (who, what resource, when, action type).
 */
export function logAuditEvent(event: AuditEvent): void {
  // Fire-and-forget — do not await
  _writeAuditLog(event).catch((error) => {
    console.error("[AUDIT] Failed to write audit log:", error);
  });
}

async function _writeAuditLog(event: AuditEvent): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("audit_logs").insert({
    user_id: event.userId,
    action: event.action,
    resource_type: event.resourceType,
    resource_id: event.resourceId ?? null,
    ip_address: event.ipAddress ?? null,
  });

  if (error) {
    console.error("[AUDIT] Supabase insert error:", error.message);
  }
}

/**
 * Extract client IP address from a Request object.
 * Checks common proxy headers, falls back to null.
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; first is the client
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return undefined;
}
