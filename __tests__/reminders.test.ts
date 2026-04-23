import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateReminders,
  shouldShowReminders,
  FREQUENCY_INTERVALS,
  type UserHealthData,
  type ReminderFrequency,
} from "@/lib/health/reminders";

// ── Reminder Generation Logic ─────────────────────────────────────

describe("generateReminders", () => {
  const baseData: UserHealthData = {
    lastReportDate: null,
    upcomingAppointments: [],
    activeMedications: [],
    healthScore: null,
    lastChatDate: null,
    unreviewedReportCount: 0,
  };

  it("returns at most 3 reminders", () => {
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data: UserHealthData = {
      lastReportDate: eightMonthsAgo.toISOString(),
      upcomingAppointments: [
        {
          title: "Doctor Visit",
          providerName: "Dr. Smith",
          dateTime: tomorrow.toISOString(),
        },
      ],
      activeMedications: [
        { name: "Metformin", timeOfDay: "morning" },
      ],
      healthScore: 550,
      lastChatDate: tenDaysAgo.toISOString(),
      unreviewedReportCount: 2,
    };

    const result = generateReminders(data);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("generates retest reminder when last report is 6+ months old", () => {
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

    const data: UserHealthData = {
      ...baseData,
      lastReportDate: eightMonthsAgo.toISOString(),
    };

    const result = generateReminders(data);
    const retest = result.find((r) => r.id === "retest-due");
    expect(retest).toBeDefined();
    expect(retest!.type).toBe("retest");
    expect(retest!.priority).toBe("high");
  });

  it("does NOT generate retest reminder for recent reports", () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const data: UserHealthData = {
      ...baseData,
      lastReportDate: oneMonthAgo.toISOString(),
    };

    const result = generateReminders(data);
    const retest = result.find((r) => r.id === "retest-due");
    expect(retest).toBeUndefined();
  });

  it("generates first-report reminder when no reports exist", () => {
    const result = generateReminders(baseData);
    const firstReport = result.find((r) => r.id === "first-report");
    expect(firstReport).toBeDefined();
    expect(firstReport!.type).toBe("health_check");
  });

  it("generates appointment reminder for tomorrow's appointment", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data: UserHealthData = {
      ...baseData,
      upcomingAppointments: [
        {
          title: "Annual Checkup",
          providerName: "Dr. Jones",
          dateTime: tomorrow.toISOString(),
        },
      ],
    };

    const result = generateReminders(data);
    const appt = result.find((r) => r.type === "appointment");
    expect(appt).toBeDefined();
    expect(appt!.priority).toBe("high");
    expect(appt!.message).toContain("Annual Checkup");
    expect(appt!.message).toContain("Dr. Jones");
  });

  it("does NOT generate appointment reminder for appointments 3+ days away", () => {
    const threeDaysOut = new Date();
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    const data: UserHealthData = {
      ...baseData,
      upcomingAppointments: [
        {
          title: "Future Visit",
          providerName: null,
          dateTime: threeDaysOut.toISOString(),
        },
      ],
    };

    const result = generateReminders(data);
    const appt = result.find((r) => r.type === "appointment");
    expect(appt).toBeUndefined();
  });

  it("generates medication reminder for morning medications", () => {
    const data: UserHealthData = {
      ...baseData,
      activeMedications: [
        { name: "Metformin", timeOfDay: "morning" },
        { name: "Lisinopril", timeOfDay: "morning" },
      ],
    };

    const result = generateReminders(data);
    const med = result.find((r) => r.type === "medication");
    expect(med).toBeDefined();
    expect(med!.priority).toBe("medium");
    expect(med!.message).toContain("Metformin");
    expect(med!.message).toContain("Lisinopril");
  });

  it("generates health score improvement reminder for low scores", () => {
    const data: UserHealthData = {
      ...baseData,
      healthScore: 580,
    };

    const result = generateReminders(data);
    const goal = result.find((r) => r.type === "goal");
    expect(goal).toBeDefined();
    expect(goal!.message).toContain("580");
  });

  it("does NOT generate health score reminder for good scores", () => {
    const data: UserHealthData = {
      ...baseData,
      healthScore: 750,
    };

    const result = generateReminders(data);
    const goal = result.find((r) => r.type === "goal");
    expect(goal).toBeUndefined();
  });

  it("generates engagement reminder when no chat in 7+ days", () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const data: UserHealthData = {
      ...baseData,
      lastChatDate: tenDaysAgo.toISOString(),
    };

    const result = generateReminders(data);
    const engagement = result.find((r) => r.type === "engagement");
    expect(engagement).toBeDefined();
    expect(engagement!.priority).toBe("low");
  });

  it("does NOT generate engagement reminder for recent chat", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const data: UserHealthData = {
      ...baseData,
      lastChatDate: twoDaysAgo.toISOString(),
    };

    const result = generateReminders(data);
    const engagement = result.find((r) => r.type === "engagement");
    expect(engagement).toBeUndefined();
  });

  it("generates unreviewed reports reminder", () => {
    const data: UserHealthData = {
      ...baseData,
      unreviewedReportCount: 3,
    };

    const result = generateReminders(data);
    const unreviewed = result.find((r) => r.id === "unreviewed-reports");
    expect(unreviewed).toBeDefined();
    expect(unreviewed!.message).toContain("3 reports");
  });

  it("sorts reminders by priority (high first)", () => {
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const data: UserHealthData = {
      ...baseData,
      lastReportDate: eightMonthsAgo.toISOString(),
      healthScore: 580,
      lastChatDate: tenDaysAgo.toISOString(),
    };

    const result = generateReminders(data);
    expect(result.length).toBeGreaterThan(0);
    // First should be high priority (retest)
    expect(result[0].priority).toBe("high");
  });

  it("returns empty array when no reminders are applicable", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1);

    const data: UserHealthData = {
      lastReportDate: recentDate.toISOString(),
      upcomingAppointments: [],
      activeMedications: [],
      healthScore: 800,
      lastChatDate: recentDate.toISOString(),
      unreviewedReportCount: 0,
    };

    const result = generateReminders(data);
    expect(result).toEqual([]);
  });
});

// ── Frequency Gating ──────────────────────────────────────────────

describe("shouldShowReminders", () => {
  it("returns true when lastShown is null", () => {
    expect(shouldShowReminders("daily", null)).toBe(true);
  });

  it("returns true when lastShown is invalid", () => {
    expect(shouldShowReminders("daily", "not-a-date")).toBe(true);
  });

  it("returns false for daily frequency if shown less than 24h ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(shouldShowReminders("daily", twoHoursAgo.toISOString())).toBe(
      false
    );
  });

  it("returns true for daily frequency if shown more than 24h ago", () => {
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
    expect(shouldShowReminders("daily", thirtyHoursAgo.toISOString())).toBe(
      true
    );
  });

  it("returns false for twice_daily if shown less than 12h ago", () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    expect(
      shouldShowReminders("twice_daily", sixHoursAgo.toISOString())
    ).toBe(false);
  });

  it("returns true for twice_daily if shown more than 12h ago", () => {
    const fourteenHoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000);
    expect(
      shouldShowReminders("twice_daily", fourteenHoursAgo.toISOString())
    ).toBe(true);
  });

  it("returns false for weekly if shown less than 7 days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(shouldShowReminders("weekly", threeDaysAgo.toISOString())).toBe(
      false
    );
  });

  it("returns true for weekly if shown more than 7 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(shouldShowReminders("weekly", eightDaysAgo.toISOString())).toBe(
      true
    );
  });
});

// ── Frequency Intervals ───────────────────────────────────────────

describe("FREQUENCY_INTERVALS", () => {
  it("has correct interval for twice_daily (12 hours)", () => {
    expect(FREQUENCY_INTERVALS.twice_daily).toBe(12 * 60 * 60 * 1000);
  });

  it("has correct interval for daily (24 hours)", () => {
    expect(FREQUENCY_INTERVALS.daily).toBe(24 * 60 * 60 * 1000);
  });

  it("has correct interval for weekly (7 days)", () => {
    expect(FREQUENCY_INTERVALS.weekly).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

// ── Reminders API Route ───────────────────────────────────────────

describe("Reminders API Route", () => {
  it("exports GET handler", async () => {
    const mod = await import("@/app/api/reminders/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

describe("Reminders API — GET", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      }),
    }));
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/reminders/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns empty reminders when reminders are disabled", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // Mock profile query returning reminders_enabled = false
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { reminders_enabled: false, reminder_frequency: "daily", last_reminder_shown: null },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/reminders/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reminders).toEqual([]);
  });
});

// ── Dashboard Reminders Card Component ────────────────────────────

describe("RemindersCard component", () => {
  it("exports RemindersCard as a named export", async () => {
    const mod = await import("@/app/dashboard/reminders-card");
    expect(mod.RemindersCard).toBeDefined();
    expect(typeof mod.RemindersCard).toBe("function");
  });
});

// ── Profile API — Reminder Preferences ────────────────────────────

describe("Profile API — Reminder Preferences", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockGetUser = vi.fn();
    mockFrom = vi.fn();

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      }),
    }));
  });

  it("rejects invalid reminder_frequency values", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const request = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminder_frequency: "every_minute" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("reminder_frequency");
  });

  it("rejects non-boolean reminders_enabled", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const request = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminders_enabled: "yes" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("reminders_enabled");
  });

  it("accepts valid reminder preferences", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockProfile = {
      id: "user-1",
      display_name: "Test User",
      reminder_frequency: "weekly",
      reminders_enabled: false,
      updated_at: new Date().toISOString(),
    };

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    });

    const { PUT } = await import("@/app/api/profile/route");
    const request = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reminder_frequency: "weekly",
        reminders_enabled: false,
      }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
  });
});
