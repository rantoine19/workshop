import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, getClientIp } from "@/lib/audit/logger";
import { NextResponse } from "next/server";
import {
  STANDARD_GOALS,
  calculateProgress,
  getGoalById,
  isAchieved,
} from "@/lib/health/standard-goals";
import { fetchLatestBiomarkerValue } from "@/lib/health/goal-progress";

/**
 * GET /api/goals
 *
 * Returns the user's active and achieved goals with a freshly-computed
 * progress percentage. Optional `family_member_id` query param scopes the
 * results to a family member.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const familyMemberIdParam = searchParams.get("family_member_id");
  const familyMemberId = familyMemberIdParam || null;

  let query = supabase
    .from("health_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("activated_at", { ascending: false });

  query = familyMemberId
    ? query.eq("family_member_id", familyMemberId)
    : query.is("family_member_id", null);

  const { data: rows, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }

  const goals = [];
  for (const row of rows ?? []) {
    const goal = getGoalById(row.goal_id);
    if (!goal) continue;

    // Refresh current value so the UI always shows a live number.
    let currentValue: number | null = null;
    if (row.status === "active") {
      currentValue = await fetchLatestBiomarkerValue(
        supabase,
        user.id,
        familyMemberId,
        goal
      );
    } else if (row.current_value !== null) {
      currentValue = Number(row.current_value);
    }

    const startingValue =
      row.starting_value !== null ? Number(row.starting_value) : null;

    const progress =
      currentValue !== null
        ? calculateProgress(goal, currentValue, startingValue)
        : 0;

    goals.push({
      id: row.id,
      goal_id: row.goal_id,
      status: row.status,
      activated_at: row.activated_at,
      achieved_at: row.achieved_at,
      starting_value: startingValue,
      current_value: currentValue,
      progress,
      goal,
    });
  }

  return NextResponse.json({ goals });
}

/**
 * POST /api/goals
 *
 * Body: { goal_id: string, family_member_id?: string | null }
 *
 * Activates a standard goal. If the goal already exists in a paused state
 * it is reactivated; otherwise a new row is inserted. Starting value is
 * captured from the latest biomarker reading at activation.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const goalId = typeof body.goal_id === "string" ? body.goal_id : "";
  const goal = getGoalById(goalId);
  if (!goal) {
    return NextResponse.json(
      { error: "Unknown goal_id" },
      { status: 400 }
    );
  }

  const familyMemberId =
    typeof body.family_member_id === "string" && body.family_member_id
      ? body.family_member_id
      : null;

  // Capture the starting biomarker value if available.
  const startingValue = await fetchLatestBiomarkerValue(
    supabase,
    user.id,
    familyMemberId,
    goal
  );

  // Also determine if we should immediately mark as achieved.
  const alreadyAchieved =
    startingValue !== null && isAchieved(goal, startingValue);

  const now = new Date().toISOString();

  // Upsert semantics: if the goal row exists (paused/achieved), reactivate.
  let existingQuery = supabase
    .from("health_goals")
    .select("id, starting_value")
    .eq("user_id", user.id)
    .eq("goal_id", goalId);

  existingQuery = familyMemberId
    ? existingQuery.eq("family_member_id", familyMemberId)
    : existingQuery.is("family_member_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {
      status: alreadyAchieved ? "achieved" : "active",
      current_value: startingValue,
      updated_at: now,
    };
    if (alreadyAchieved) {
      updates.achieved_at = now;
    } else {
      updates.achieved_at = null;
    }
    // Reset starting value only if we don't have one yet.
    if (existing.starting_value === null && startingValue !== null) {
      updates.starting_value = startingValue;
    }

    const { data: updated, error: updateError } = await supabase
      .from("health_goals")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Failed to activate goal" },
        { status: 500 }
      );
    }

    logAuditEvent({
      userId: user.id,
      action: "goal.activated",
      resourceType: "health_goal",
      resourceId: updated.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ goal: updated }, { status: 200 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("health_goals")
    .insert({
      user_id: user.id,
      family_member_id: familyMemberId,
      goal_id: goalId,
      status: alreadyAchieved ? "achieved" : "active",
      activated_at: now,
      achieved_at: alreadyAchieved ? now : null,
      starting_value: startingValue,
      current_value: startingValue,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Failed to activate goal" },
      { status: 500 }
    );
  }

  logAuditEvent({
    userId: user.id,
    action: "goal.activated",
    resourceType: "health_goal",
    resourceId: inserted.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ goal: inserted }, { status: 201 });
}
