/**
 * Smart Reminder Generation
 *
 * Generates contextual reminders based on actual user health data.
 * Reminders are sorted by priority and limited to the top 3 most relevant.
 */

export type ReminderType =
  | "health_check"
  | "appointment"
  | "medication"
  | "retest"
  | "goal"
  | "engagement";

export type ReminderPriority = "high" | "medium" | "low";

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: ReminderPriority;
  icon: string;
}

export type ReminderFrequency = "twice_daily" | "daily" | "weekly";

export const REMINDER_FREQUENCIES: {
  value: ReminderFrequency;
  label: string;
  description: string;
}[] = [
  {
    value: "twice_daily",
    label: "2x a day",
    description: "Morning and evening check-ins",
  },
  {
    value: "daily",
    label: "Daily",
    description: "One daily health reminder (recommended)",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "Weekly health summary",
  },
];

/** Minimum milliseconds between reminder displays for each frequency */
export const FREQUENCY_INTERVALS: Record<ReminderFrequency, number> = {
  twice_daily: 12 * 60 * 60 * 1000, // 12 hours
  daily: 24 * 60 * 60 * 1000, // 24 hours
  weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Check whether enough time has elapsed since the last reminder was shown,
 * based on the user's chosen frequency.
 */
export function shouldShowReminders(
  frequency: ReminderFrequency,
  lastShown: string | null
): boolean {
  if (!lastShown) return true;

  const lastShownDate = new Date(lastShown);
  if (isNaN(lastShownDate.getTime())) return true;

  const elapsed = Date.now() - lastShownDate.getTime();
  return elapsed >= FREQUENCY_INTERVALS[frequency];
}

export interface UserHealthData {
  /** ISO timestamp of the most recent lab report upload */
  lastReportDate: string | null;
  /** Upcoming appointments (next 7 days) */
  upcomingAppointments: Array<{
    title: string;
    providerName: string | null;
    dateTime: string;
  }>;
  /** Active medications with time-of-day info */
  activeMedications: Array<{
    name: string;
    timeOfDay: string | null;
  }>;
  /** Current health credit score (300-850) */
  healthScore: number | null;
  /** ISO timestamp of the user's last chat session */
  lastChatDate: string | null;
  /** Number of reports that have not been viewed/reviewed */
  unreviewedReportCount: number;
}

const PRIORITY_ORDER: Record<ReminderPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const MAX_REMINDERS = 3;

/**
 * Generate contextual reminders from user health data.
 * Returns up to 3 reminders sorted by priority.
 */
export function generateReminders(data: UserHealthData): Reminder[] {
  const reminders: Reminder[] = [];
  const now = new Date();

  // 1. Retest reminder — 6+ months since last lab report
  if (data.lastReportDate) {
    const lastReport = new Date(data.lastReportDate);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (lastReport < sixMonthsAgo) {
      const monthsAgo = Math.floor(
        (now.getTime() - lastReport.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );
      reminders.push({
        id: "retest-due",
        type: "retest",
        title: "Time for a checkup",
        message: `It's been ${monthsAgo} months since your last lab report. Time for routine blood work!`,
        actionUrl: "/upload",
        actionLabel: "Upload Results",
        priority: "high",
        icon: "🔬",
      });
    }
  } else {
    // No reports at all
    reminders.push({
      id: "first-report",
      type: "health_check",
      title: "Upload your first report",
      message:
        "Get started by uploading a lab report to see personalized health insights.",
      actionUrl: "/upload",
      actionLabel: "Upload Report",
      priority: "medium",
      icon: "📋",
    });
  }

  // 2. Appointment reminders — upcoming in the next 2 days
  for (const appt of data.upcomingAppointments) {
    const apptDate = new Date(appt.dateTime);
    const diffMs = apptDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 0 && diffHours <= 48) {
      const timeLabel =
        diffHours <= 24
          ? "today"
          : "tomorrow";
      const provider = appt.providerName
        ? ` with ${appt.providerName}`
        : "";

      reminders.push({
        id: `appt-${appt.dateTime}`,
        type: "appointment",
        title: `Appointment ${timeLabel}`,
        message: `You have "${appt.title}"${provider} ${timeLabel}. Review your questions and recent results beforehand.`,
        actionUrl: "/appointments",
        actionLabel: "View Details",
        priority: "high",
        icon: "📅",
      });
    }
  }

  // 3. Medication reminders — morning meds
  const morningMeds = data.activeMedications.filter(
    (m) => m.timeOfDay === "morning" || m.timeOfDay === "am"
  );
  if (morningMeds.length > 0) {
    const medNames = morningMeds
      .slice(0, 3)
      .map((m) => m.name)
      .join(", ");
    reminders.push({
      id: "medication-morning",
      type: "medication",
      title: "Medication reminder",
      message: `Don't forget your morning medications: ${medNames}.`,
      actionUrl: "/medications",
      actionLabel: "View Medications",
      priority: "medium",
      icon: "💊",
    });
  }

  // 4. Health score improvement
  if (data.healthScore !== null && data.healthScore < 700) {
    reminders.push({
      id: "health-score-improve",
      type: "goal",
      title: "Improve your health score",
      message: `Your Health Score is ${data.healthScore}. Check your dashboard for personalized tips to improve it.`,
      actionUrl: "/dashboard",
      actionLabel: "View Tips",
      priority: "medium",
      icon: "📊",
    });
  }

  // 5. Engagement — no chat in 7+ days
  if (data.lastChatDate) {
    const lastChat = new Date(data.lastChatDate);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (lastChat < sevenDaysAgo) {
      reminders.push({
        id: "chat-engagement",
        type: "engagement",
        title: "Check in on your health",
        message:
          "You haven't chatted about your health in a while. Have a question about your results?",
        actionUrl: "/chat",
        actionLabel: "Start Chat",
        priority: "low",
        icon: "💬",
      });
    }
  }

  // 6. Unreviewed reports
  if (data.unreviewedReportCount > 0) {
    reminders.push({
      id: "unreviewed-reports",
      type: "health_check",
      title: "Review your results",
      message: `You have ${data.unreviewedReportCount} report${data.unreviewedReportCount > 1 ? "s" : ""} you haven't reviewed yet. See what your results mean.`,
      actionUrl: "/reports",
      actionLabel: "View Reports",
      priority: "low",
      icon: "📄",
    });
  }

  // Sort by priority, take top 3
  reminders.sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  return reminders.slice(0, MAX_REMINDERS);
}
