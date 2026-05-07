import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isInQuietHours,
  wasRecentlySent,
  computePendingReminders,
  DEFAULT_PREFERENCES,
} from "@/lib/notifications/smart-reminders";

// ── Quiet Hours Logic ─────────────────────────────────

describe("isInQuietHours", () => {
  it("returns true when now is inside an overnight quiet window", () => {
    // 23:00, quiet 21:00 -> 08:00
    const now = new Date(2026, 0, 15, 23, 0);
    expect(isInQuietHours("21:00", "08:00", now)).toBe(true);
  });

  it("returns true at 03:00 inside overnight window", () => {
    const now = new Date(2026, 0, 15, 3, 0);
    expect(isInQuietHours("21:00", "08:00", now)).toBe(true);
  });

  it("returns false at noon outside overnight window", () => {
    const now = new Date(2026, 0, 15, 12, 0);
    expect(isInQuietHours("21:00", "08:00", now)).toBe(false);
  });

  it("handles same-day ranges", () => {
    const insideRange = new Date(2026, 0, 15, 13, 0);
    const outsideRange = new Date(2026, 0, 15, 9, 0);
    expect(isInQuietHours("12:00", "14:00", insideRange)).toBe(true);
    expect(isInQuietHours("12:00", "14:00", outsideRange)).toBe(false);
  });

  it("returns false when start == end (degenerate)", () => {
    const now = new Date(2026, 0, 15, 12, 0);
    expect(isInQuietHours("12:00", "12:00", now)).toBe(false);
  });

  it("returns false for malformed time strings", () => {
    const now = new Date(2026, 0, 15, 12, 0);
    expect(isInQuietHours("not-a-time", "08:00", now)).toBe(false);
  });
});

// ── Throttling Logic ──────────────────────────────────

describe("wasRecentlySent", () => {
  it("returns true if a recent log entry of that type exists", () => {
    const now = new Date(2026, 0, 15, 12, 0);
    const logs = [
      {
        reminder_type: "daily_checkin",
        sent_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      },
    ];
    expect(wasRecentlySent(logs, "daily_checkin", 24 * 60 * 60 * 1000, now)).toBe(true);
  });

  it("returns false if log entry is outside the window", () => {
    const now = new Date(2026, 0, 15, 12, 0);
    const logs = [
      {
        reminder_type: "daily_checkin",
        sent_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
      },
    ];
    expect(wasRecentlySent(logs, "daily_checkin", 24 * 60 * 60 * 1000, now)).toBe(false);
  });

  it("returns false if no entries match the type", () => {
    const now = new Date();
    const logs = [
      { reminder_type: "appointment", sent_at: now.toISOString() },
    ];
    expect(wasRecentlySent(logs, "daily_checkin", 24 * 60 * 60 * 1000, now)).toBe(false);
  });
});

// ── computePendingReminders ──────────────────────────

function makeSupabaseMock(opts: {
  prefs?: Record<string, unknown> | null;
  log?: Array<{ reminder_type: string; sent_at: string }>;
  meds?: Array<{ name: string; time_of_day: string | null; active: boolean }>;
  appts?: Array<{ title: string; date_time: string }>;
  reports?: Array<{ created_at: string }>;
}) {
  const tableHandlers: Record<string, () => unknown> = {
    notification_preferences: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: opts.prefs ?? null, error: null }),
        }),
      }),
    }),
    notification_log: () => ({
      select: () => ({
        eq: () => ({
          gte: () =>
            Promise.resolve({ data: opts.log ?? [], error: null }),
        }),
      }),
    }),
    medications: () => ({
      select: () => ({
        eq: () => ({
          eq: () =>
            Promise.resolve({ data: opts.meds ?? [], error: null }),
        }),
      }),
    }),
    appointments: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: () => ({
              order: () =>
                Promise.resolve({ data: opts.appts ?? [], error: null }),
            }),
          }),
        }),
      }),
    }),
    reports: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () =>
              Promise.resolve({ data: opts.reports ?? [], error: null }),
          }),
        }),
      }),
    }),
  };

  return {
    from: (table: string) => {
      const handler = tableHandlers[table];
      if (!handler) throw new Error(`Unexpected table: ${table}`);
      return handler();
    },
  } as unknown as Parameters<typeof computePendingReminders>[1];
}

describe("computePendingReminders", () => {
  it("returns [] when notifications are disabled", async () => {
    const supabase = makeSupabaseMock({
      prefs: { ...DEFAULT_PREFERENCES, notifications_enabled: false },
    });
    const noon = new Date(2026, 0, 15, 12, 0);
    const result = await computePendingReminders("user-1", supabase, noon);
    expect(result).toEqual([]);
  });

  it("returns [] when currently in quiet hours", async () => {
    const supabase = makeSupabaseMock({
      prefs: { ...DEFAULT_PREFERENCES },
    });
    // Default quiet hours are 21:00 -> 08:00, so 23:00 is quiet
    const lateNight = new Date(2026, 0, 15, 23, 0);
    const result = await computePendingReminders("user-1", supabase, lateNight);
    expect(result).toEqual([]);
  });

  it("returns daily check-in when enabled and outside quiet hours", async () => {
    const supabase = makeSupabaseMock({
      prefs: { ...DEFAULT_PREFERENCES },
    });
    const noon = new Date(2026, 0, 15, 12, 0);
    const result = await computePendingReminders("user-1", supabase, noon);
    expect(result.some((r) => r.type === "daily_checkin")).toBe(true);
  });

  it("does not duplicate daily check-in when one was sent recently", async () => {
    const noon = new Date(2026, 0, 15, 12, 0);
    const supabase = makeSupabaseMock({
      prefs: { ...DEFAULT_PREFERENCES },
      log: [
        {
          reminder_type: "daily_checkin",
          sent_at: new Date(noon.getTime() - 60 * 60 * 1000).toISOString(),
        },
      ],
    });
    const result = await computePendingReminders("user-1", supabase, noon);
    expect(result.some((r) => r.type === "daily_checkin")).toBe(false);
  });

  it("returns blood_work reminder when no reports exist", async () => {
    const supabase = makeSupabaseMock({
      prefs: { ...DEFAULT_PREFERENCES },
      reports: [],
    });
    const noon = new Date(2026, 0, 15, 12, 0);
    const result = await computePendingReminders("user-1", supabase, noon);
    expect(result.some((r) => r.type === "blood_work")).toBe(true);
  });

  it("returns appointment reminder when one is within the next hour", async () => {
    const noon = new Date(2026, 0, 15, 12, 0);
    const inThirtyMin = new Date(noon.getTime() + 30 * 60 * 1000);
    const supabase = makeSupabaseMock({
      prefs: { ...DEFAULT_PREFERENCES },
      appts: [
        { title: "Annual Checkup", date_time: inThirtyMin.toISOString() },
      ],
    });
    const result = await computePendingReminders("user-1", supabase, noon);
    const appt = result.find((r) => r.type === "appointment");
    expect(appt).toBeDefined();
    expect(appt!.body).toContain("Annual Checkup");
  });

  it("uses default preferences when none exist in DB", async () => {
    const supabase = makeSupabaseMock({ prefs: null });
    const noon = new Date(2026, 0, 15, 12, 0);
    const result = await computePendingReminders("user-1", supabase, noon);
    // Default is to send daily check-in
    expect(result.length).toBeGreaterThan(0);
  });

  it("daily_tip is OFF by default", async () => {
    const supabase = makeSupabaseMock({ prefs: null });
    const noon = new Date(2026, 0, 15, 12, 0);
    const result = await computePendingReminders("user-1", supabase, noon);
    expect(result.some((r) => r.type === "daily_tip")).toBe(false);
  });
});

// ── Preferences API ────────────────────────────────────

describe("Notifications Preferences API", () => {
  it("exports GET and PUT handlers", async () => {
    const mod = await import("@/app/api/notifications/preferences/route");
    expect(mod.GET).toBeDefined();
    expect(mod.PUT).toBeDefined();
  });
});

describe("Notifications Preferences API — GET", () => {
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
    const { GET } = await import("@/app/api/notifications/preferences/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns existing preferences if present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const fakePrefs = {
      ...DEFAULT_PREFERENCES,
      user_id: "u1",
      notifications_enabled: false,
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: fakePrefs, error: null }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/notifications/preferences/route");
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.preferences.notifications_enabled).toBe(false);
  });
});

describe("Notifications Preferences API — PUT", () => {
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

  it("returns 400 for invalid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { PUT } = await import("@/app/api/notifications/preferences/route");
    const req = new Request("http://x/preferences", {
      method: "PUT",
      body: "not-json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("validates daily_checkin_frequency enum", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...DEFAULT_PREFERENCES, user_id: "u1" },
            error: null,
          }),
        }),
      }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "row-1" }, error: null }),
        }),
      }),
      update: updateMock,
    });

    const { PUT } = await import("@/app/api/notifications/preferences/route");
    const req = new Request("http://x/preferences", {
      method: "PUT",
      body: JSON.stringify({
        daily_checkin_frequency: "invalid_value",
      }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);

    // Verify the invalid value was filtered out before update
    const passedUpdate = updateMock.mock.calls[0][0];
    expect(passedUpdate.daily_checkin_frequency).toBeUndefined();
  });

  it("rejects malformed quiet_hours_start", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...DEFAULT_PREFERENCES, user_id: "u1" },
            error: null,
          }),
        }),
      }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "row-1" }, error: null }),
        }),
      }),
      update: updateMock,
    });

    const { PUT } = await import("@/app/api/notifications/preferences/route");
    const req = new Request("http://x/preferences", {
      method: "PUT",
      body: JSON.stringify({ quiet_hours_start: "9pm" }),
    });
    await PUT(req);
    const passedUpdate = updateMock.mock.calls[0][0];
    expect(passedUpdate.quiet_hours_start).toBeUndefined();
  });
});

// ── Subscribe API ──────────────────────────────────────

describe("Notifications Subscribe API", () => {
  it("exports POST and DELETE handlers", async () => {
    const mod = await import("@/app/api/notifications/subscribe/route");
    expect(mod.POST).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

describe("Notifications Subscribe API — POST", () => {
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

  it("rejects bodies missing endpoint", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/notifications/subscribe/route");
    const req = new Request("http://x/subscribe", {
      method: "POST",
      body: JSON.stringify({ keys: { auth: "x", p256dh: "y" } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/notifications/subscribe/route");
    const req = new Request("http://x/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: "https://push.example/abc" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ── Log API ────────────────────────────────────────────

describe("Notifications Log API", () => {
  it("exports GET, POST, DELETE handlers", async () => {
    const mod = await import("@/app/api/notifications/log/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

describe("Notifications Log API — POST", () => {
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

  it("rejects invalid reminder_type when inserting", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/notifications/log/route");
    const req = new Request("http://x/log", {
      method: "POST",
      body: JSON.stringify({
        reminder_type: "not-a-real-type",
        title: "x",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects insert without title", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/notifications/log/route");
    const req = new Request("http://x/log", {
      method: "POST",
      body: JSON.stringify({
        reminder_type: "daily_checkin",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ── Notification Settings Page ────────────────────────

describe("Notifications Settings Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/settings/notifications/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("NotificationBell component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/components/ui/NotificationBell");
    expect(mod.default).toBeDefined();
  });
});

describe("useNotificationPermission hook", () => {
  it("exports the hook", async () => {
    const mod = await import("@/hooks/useNotificationPermission");
    expect(mod.useNotificationPermission).toBeDefined();
    expect(typeof mod.useNotificationPermission).toBe("function");
  });
});
