import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";

const VALID_STATUSES = new Set(["active", "achieved", "paused"]);

/**
 * PUT /api/goals/[id]
 *
 * Update the status of a health goal (activate / pause / achieved).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let auditAction: "goal.activated" | "goal.paused" | "goal.achieved" =
    "goal.activated";

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }
    updates.status = body.status;

    if (body.status === "achieved") {
      updates.achieved_at = new Date().toISOString();
      auditAction = "goal.achieved";
    } else if (body.status === "paused") {
      auditAction = "goal.paused";
    } else if (body.status === "active") {
      updates.achieved_at = null;
      auditAction = "goal.activated";
    }
  }

  const { data: goal, error } = await supabase
    .from("health_goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  logAuditEvent({
    userId: user.id,
    action: auditAction,
    resourceType: "health_goal",
    resourceId: goal.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ goal });
}

/**
 * DELETE /api/goals/[id]
 *
 * Remove a health goal entirely.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("health_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "goal.deleted",
    resourceType: "health_goal",
    resourceId: id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
