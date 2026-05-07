/**
 * Smart push reminder logic.
 *
 * Computes the set of pending push reminders for a user RIGHT NOW based on
 * their notification preferences, quiet hours, and existing health data
 * (medications, appointments, last report, etc.).
 *
 * This is intentionally pure-ish: it accepts a Supabase client (real or
 * mock) and a userId, so it can be tested with mocked Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReminderKind =
  | "daily_checkin"
  | "medication"
  | "appointment"
  | "blood_work"
  | "daily_tip"
  | "goal_progress";

export interface PendingReminder {
  type: ReminderKind;
  title: string;
  body: string;
  url?: string;
}

export interface NotificationPreferences {
  notifications_enabled: boolean;
  daily_checkin_enabled: boolean;
  daily_checkin_frequency: string;
  medication_reminders_enabled: boolean;
  medication_reminder_minutes_before: number;
  appointment_reminders_enabled: boolean;
  blood_work_reminders_enabled: boolean;
  blood_work_interval_months: number;
  goal_progress_enabled: boolean;
  goal_progress_frequency: string;
  daily_tip_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifications_enabled: true,
  daily_checkin_enabled: true,
  daily_checkin_frequency: "daily",
  medication_reminders_enabled: true,
  medication_reminder_minutes_before: 0,
  appointment_reminders_enabled: true,
  blood_work_reminders_enabled: true,
  blood_work_interval_months: 6,
  goal_progress_enabled: true,
  goal_progress_frequency: "weekly",
  daily_tip_enabled: false,
  quiet_hours_start: "21:00",
  quiet_hours_end: "08:00",
  timezone: "America/New_York",
};

/**
 * Returns true if the given time is currently inside the user's quiet hours.
 * Handles overnight ranges (e.g. 21:00 -> 08:00).
 *
 * `now` is optional for testing.
 */
export function isInQuietHours(
  start: string,
  end: string,
  now: Date = new Date()
): boolean {
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);

  if (
    Number.isNaN(sH) ||
    Number.isNaN(sM) ||
    Number.isNaN(eH) ||
    Number.isNaN(eM)
  ) {
    return false;
  }

  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    // Same-day range
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  // Overnight range — true if now >= start OR now < end
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * True if the most recent log entry of `type` was within the last `windowMs`.
 * Used to throttle notifications so we don't repeat them.
 */
export function wasRecentlySent(
  logs: { reminder_type: string; sent_at: string }[],
  type: ReminderKind,
  windowMs: number,
  now: Date = new Date()
): boolean {
  const recent = logs.find(
    (l) =>
      l.reminder_type === type &&
      now.getTime() - new Date(l.sent_at).getTime() < windowMs
  );
  return Boolean(recent);
}

const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;

/**
 * Compute the list of reminders that should be triggered for a user RIGHT NOW.
 * Caller is responsible for actually sending them (via push, etc.) and
 * recording them in `notification_log`.
 */
export async function computePendingReminders(
  userId: string,
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<PendingReminder[]> {
  // Load preferences (or defaults)
  const { data: prefRow } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const prefs: NotificationPreferences = prefRow
    ? { ...DEFAULT_PREFERENCES, ...prefRow }
    : DEFAULT_PREFERENCES;

  // Master switch
  if (!prefs.notifications_enabled) return [];

  // Quiet hours suppress everything
  if (isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end, now)) {
    return [];
  }

  // Recent log (last 24h) for throttling
  const since = new Date(now.getTime() - ONE_DAY).toISOString();
  const { data: logs } = await supabase
    .from("notification_log")
    .select("reminder_type, sent_at")
    .eq("user_id", userId)
    .gte("sent_at", since);

  const recentLogs = logs ?? [];
  const out: PendingReminder[] = [];

  // 1. Daily check-in
  if (
    prefs.daily_checkin_enabled &&
    !wasRecentlySent(recentLogs, "daily_checkin", ONE_DAY, now)
  ) {
    out.push({
      type: "daily_checkin",
      title: "Daily check-in",
      body: "How are you feeling today? Log a quick health update.",
      url: "/dashboard",
    });
  }

  // 2. Medications — match active meds with time_of_day windows
  if (prefs.medication_reminders_enabled) {
    const { data: meds } = await supabase
      .from("medications")
      .select("name, time_of_day, active")
      .eq("user_id", userId)
      .eq("active", true);

    const hour = now.getHours();
    let bucket: string | null = null;
    if (hour >= 5 && hour < 11) bucket = "morning";
    else if (hour >= 11 && hour < 14) bucket = "afternoon";
    else if (hour >= 17 && hour < 21) bucket = "evening";
    else if (hour >= 21 || hour < 1) bucket = "bedtime";

    if (bucket && meds) {
      const matching = meds.filter(
        (m: { time_of_day: string | null }) => m.time_of_day === bucket
      );
      if (
        matching.length > 0 &&
        !wasRecentlySent(
          recentLogs,
          "medication",
          4 * 60 * 60 * 1000,
          now
        )
      ) {
        out.push({
          type: "medication",
          title: "Medication reminder",
          body: `Time for your ${bucket} medication${matching.length > 1 ? "s" : ""}.`,
          url: "/medications",
        });
      }
    }
  }

  // 3. Appointments — within next hour or next 24 hours
  if (prefs.appointment_reminders_enabled) {
    const { data: appts } = await supabase
      .from("appointments")
      .select("title, date_time")
      .eq("user_id", userId)
      .gte("date_time", now.toISOString())
      .lte("date_time", new Date(now.getTime() + ONE_DAY).toISOString())
      .order("date_time", { ascending: true });

    for (const appt of appts ?? []) {
      const apptTime = new Date(appt.date_time).getTime();
      const diffMs = apptTime - now.getTime();
      if (diffMs <= 60 * 60 * 1000) {
        if (
          !wasRecentlySent(
            recentLogs,
            "appointment",
            2 * 60 * 60 * 1000,
            now
          )
        ) {
          out.push({
            type: "appointment",
            title: "Appointment soon",
            body: `${appt.title} is starting within the hour.`,
            url: "/appointments",
          });
        }
        break;
      }
      if (diffMs <= ONE_DAY) {
        if (!wasRecentlySent(recentLogs, "appointment", ONE_DAY, now)) {
          out.push({
            type: "appointment",
            title: "Appointment tomorrow",
            body: `${appt.title} is coming up. Review your questions.`,
            url: "/appointments",
          });
        }
        break;
      }
    }
  }

  // 4. Blood work — last report older than configured interval
  if (prefs.blood_work_reminders_enabled) {
    const { data: lastReports } = await supabase
      .from("reports")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastReport = lastReports?.[0];
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - prefs.blood_work_interval_months);

    const overdue =
      !lastReport ||
      new Date(lastReport.created_at).getTime() < cutoff.getTime();

    if (
      overdue &&
      !wasRecentlySent(recentLogs, "blood_work", ONE_WEEK, now)
    ) {
      out.push({
        type: "blood_work",
        title: "Time for blood work",
        body: `It's been ${prefs.blood_work_interval_months}+ months since your last lab report.`,
        url: "/upload",
      });
    }
  }

  // 5. Daily tip — only if explicitly enabled
  if (
    prefs.daily_tip_enabled &&
    !wasRecentlySent(recentLogs, "daily_tip", ONE_DAY, now)
  ) {
    out.push({
      type: "daily_tip",
      title: "Today's health tip",
      body: "Open the app to see today's personalized health tip.",
      url: "/dashboard",
    });
  }

  // 6. Goal progress — weekly summary on Sundays
  if (prefs.goal_progress_enabled) {
    const isSunday = now.getDay() === 0;
    const wantWeekly = prefs.goal_progress_frequency === "weekly";
    const wantMonthly = prefs.goal_progress_frequency === "monthly";
    const isFirstOfMonth = now.getDate() === 1;

    const shouldSend =
      (wantWeekly && isSunday) || (wantMonthly && isFirstOfMonth);

    if (
      shouldSend &&
      !wasRecentlySent(recentLogs, "goal_progress", ONE_WEEK, now)
    ) {
      out.push({
        type: "goal_progress",
        title: "Your weekly health summary",
        body: "See how you're tracking toward your health goals.",
        url: "/dashboard",
      });
    }
  }

  return out;
}
