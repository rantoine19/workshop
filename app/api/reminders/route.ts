import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  generateReminders,
  shouldShowReminders,
  type ReminderFrequency,
  type UserHealthData,
} from "@/lib/health/reminders";

const VALID_FREQUENCIES: ReminderFrequency[] = [
  "twice_daily",
  "daily",
  "weekly",
];

/**
 * GET /api/reminders
 *
 * Returns up to 3 contextual reminders based on the user's health data.
 * Respects reminder preferences (enabled/disabled, frequency gating).
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load profile with reminder preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "reminders_enabled, reminder_frequency, last_reminder_shown"
    )
    .eq("id", user.id)
    .single();

  const remindersEnabled = profile?.reminders_enabled ?? true;
  const frequency: ReminderFrequency =
    profile?.reminder_frequency &&
    VALID_FREQUENCIES.includes(profile.reminder_frequency as ReminderFrequency)
      ? (profile.reminder_frequency as ReminderFrequency)
      : "daily";
  const lastShown: string | null = profile?.last_reminder_shown ?? null;

  // If reminders are disabled, return empty
  if (!remindersEnabled) {
    return NextResponse.json({ reminders: [] });
  }

  // Check frequency gating
  if (!shouldShowReminders(frequency, lastShown)) {
    return NextResponse.json({ reminders: [] });
  }

  // Fetch user data in parallel
  const [reportsResult, appointmentsResult, medicationsResult, healthScoreResult, chatResult] =
    await Promise.all([
      // Most recent report date
      supabase
        .from("reports")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),

      // Upcoming appointments (next 7 days)
      supabase
        .from("appointments")
        .select("title, provider_name, date_time")
        .eq("user_id", user.id)
        .gte("date_time", new Date().toISOString())
        .lte(
          "date_time",
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("date_time", { ascending: true })
        .limit(5),

      // Active medications
      supabase
        .from("medications")
        .select("name, time_of_day")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(20),

      // Health score — fetch via the health-score API indirectly by
      // checking the most recent report's biomarkers
      supabase
        .from("reports")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),

      // Last chat session date
      supabase
        .from("chat_sessions")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

  // Build user health data
  const userData: UserHealthData = {
    lastReportDate:
      reportsResult.data?.[0]?.created_at ?? null,
    upcomingAppointments: (appointmentsResult.data ?? []).map((a) => ({
      title: a.title,
      providerName: a.provider_name,
      dateTime: a.date_time,
    })),
    activeMedications: (medicationsResult.data ?? []).map((m) => ({
      name: m.name,
      timeOfDay: m.time_of_day,
    })),
    healthScore: null, // Computed client-side; pass null here
    lastChatDate:
      chatResult.data?.[0]?.created_at ?? null,
    unreviewedReportCount: 0, // Simplified for MVP
  };

  const reminders = generateReminders(userData);

  // Update last_reminder_shown if we have reminders to show
  if (reminders.length > 0) {
    await supabase
      .from("profiles")
      .update({ last_reminder_shown: new Date().toISOString() })
      .eq("id", user.id);
  }

  return NextResponse.json({ reminders });
}
