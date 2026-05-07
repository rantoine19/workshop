import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DEFAULT_PREFERENCES } from "@/lib/notifications/smart-reminders";

const VALID_DAILY_FREQUENCIES = ["daily", "twice_daily", "weekly"];
const VALID_GOAL_FREQUENCIES = ["weekly", "monthly"];
const VALID_MED_MINUTES = [0, 15, 30, 60];
const VALID_BLOOD_INTERVALS = [3, 6, 12];

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * GET /api/notifications/preferences
 *
 * Returns the user's notification preferences. Creates a default row if one
 * does not exist yet.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ preferences: existing });
  }

  // Create default row
  const { data: created, error: insertError } = await supabase
    .from("notification_preferences")
    .insert({ user_id: user.id, ...DEFAULT_PREFERENCES })
    .select()
    .single();

  if (insertError) {
    // If insert failed (e.g. another request created it), try to read again
    const { data: retry } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (retry) return NextResponse.json({ preferences: retry });

    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences: created });
}

/**
 * PUT /api/notifications/preferences
 *
 * Update notification preferences. Validates enum/numeric fields.
 */
export async function PUT(request: Request) {
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

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const boolFields: (keyof typeof DEFAULT_PREFERENCES)[] = [
    "notifications_enabled",
    "daily_checkin_enabled",
    "medication_reminders_enabled",
    "appointment_reminders_enabled",
    "blood_work_reminders_enabled",
    "goal_progress_enabled",
    "daily_tip_enabled",
  ];

  for (const f of boolFields) {
    if (typeof body[f] === "boolean") {
      update[f] = body[f];
    }
  }

  if (
    typeof body.daily_checkin_frequency === "string" &&
    VALID_DAILY_FREQUENCIES.includes(body.daily_checkin_frequency)
  ) {
    update.daily_checkin_frequency = body.daily_checkin_frequency;
  }

  if (
    typeof body.goal_progress_frequency === "string" &&
    VALID_GOAL_FREQUENCIES.includes(body.goal_progress_frequency)
  ) {
    update.goal_progress_frequency = body.goal_progress_frequency;
  }

  if (
    typeof body.medication_reminder_minutes_before === "number" &&
    VALID_MED_MINUTES.includes(body.medication_reminder_minutes_before)
  ) {
    update.medication_reminder_minutes_before =
      body.medication_reminder_minutes_before;
  }

  if (
    typeof body.blood_work_interval_months === "number" &&
    VALID_BLOOD_INTERVALS.includes(body.blood_work_interval_months)
  ) {
    update.blood_work_interval_months = body.blood_work_interval_months;
  }

  if (
    typeof body.quiet_hours_start === "string" &&
    TIME_RE.test(body.quiet_hours_start)
  ) {
    update.quiet_hours_start = body.quiet_hours_start;
  }

  if (
    typeof body.quiet_hours_end === "string" &&
    TIME_RE.test(body.quiet_hours_end)
  ) {
    update.quiet_hours_end = body.quiet_hours_end;
  }

  if (typeof body.timezone === "string" && body.timezone.length < 100) {
    update.timezone = body.timezone;
  }

  // Upsert: ensure a row exists
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { data: created, error: insertError } = await supabase
      .from("notification_preferences")
      .insert({ user_id: user.id, ...DEFAULT_PREFERENCES, ...update })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save preferences" },
        { status: 500 }
      );
    }
    return NextResponse.json({ preferences: created });
  }

  const { data: updated, error: updateError } = await supabase
    .from("notification_preferences")
    .update(update)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences: updated });
}
