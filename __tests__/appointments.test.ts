import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Appointments API Route — GET/POST ──────────────────────────────

describe("Appointments API Route", () => {
  it("exports GET and POST handlers", async () => {
    const mod = await import("@/app/api/appointments/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("Appointments API — GET", () => {
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

    const { GET } = await import("@/app/api/appointments/route");
    const request = new Request("http://localhost:3000/api/appointments");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns 200 with appointments list for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockAppointments = [
      { id: "appt-1", title: "Doctor Visit", date_time: "2026-04-20T14:00:00Z" },
      { id: "appt-2", title: "Dental Checkup", date_time: "2026-04-25T10:00:00Z" },
    ];

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockAppointments,
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/appointments/route");
    const request = new Request("http://localhost:3000/api/appointments");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.appointments).toHaveLength(2);
    expect(body.appointments[0].title).toBe("Doctor Visit");
  });

  it("filters by family_member_id when provided", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockEq = vi.fn();
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "appt-1", title: "Mom Visit" }],
      error: null,
    });

    // First eq is user_id, second is family_member_id
    mockEq.mockReturnValueOnce({ order: mockOrder });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
          eq: mockEq,
        }),
      }),
    });

    const { GET } = await import("@/app/api/appointments/route");
    const request = new Request(
      "http://localhost:3000/api/appointments?family_member_id=fam-1"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});

describe("Appointments API — POST", () => {
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

    const { POST } = await import("@/app/api/appointments/route");
    const request = new Request("http://localhost:3000/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/appointments/route");
    const request = new Request("http://localhost:3000/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_time: "2026-04-20T14:00:00Z" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("title");
  });

  it("returns 400 when date_time is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/appointments/route");
    const request = new Request("http://localhost:3000/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Doctor Visit" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("date_time");
  });

  it("returns 201 on successful creation", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockAppointment = {
      id: "appt-1",
      title: "Doctor Visit",
      date_time: "2026-04-20T14:00:00Z",
      appointment_type: "doctor",
      duration_minutes: 30,
    };

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockAppointment,
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/appointments/route");
    const request = new Request("http://localhost:3000/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Doctor Visit",
        date_time: "2026-04-20T14:00:00Z",
        appointment_type: "doctor",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.appointment.title).toBe("Doctor Visit");
  });
});

// ── Single Appointment API — GET/PUT/DELETE ─────────────────────────

describe("Single Appointment API Route", () => {
  it("exports GET, PUT, and DELETE handlers", async () => {
    const mod = await import("@/app/api/appointments/[id]/route");
    expect(mod.GET).toBeDefined();
    expect(mod.PUT).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

describe("Single Appointment API — DELETE", () => {
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

    const { DELETE } = await import("@/app/api/appointments/[id]/route");
    const request = new Request("http://localhost:3000/api/appointments/appt-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "appt-1" }),
    });

    expect(response.status).toBe(401);
  });
});

describe("Single Appointment API — PUT", () => {
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

    const { PUT } = await import("@/app/api/appointments/[id]/route");
    const request = new Request("http://localhost:3000/api/appointments/appt-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "appt-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 when title is empty string", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/appointments/[id]/route");
    const request = new Request("http://localhost:3000/api/appointments/appt-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "appt-1" }),
    });

    expect(response.status).toBe(400);
  });
});

// ── iCal Export API ─────────────────────────────────────────────────

describe("iCal Export API Route", () => {
  it("exports GET handler", async () => {
    const mod = await import("@/app/api/appointments/[id]/ical/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});

describe("iCal Export API — GET", () => {
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

    const { GET } = await import("@/app/api/appointments/[id]/ical/route");
    const request = new Request(
      "http://localhost:3000/api/appointments/appt-1/ical"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "appt-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns correct iCal format for an appointment", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockAppointment = {
      id: "appt-1",
      title: "Doctor Visit",
      provider_name: "Dr. Smith",
      provider_location: "123 Medical Blvd",
      appointment_type: "doctor",
      date_time: "2026-04-20T14:00:00.000Z",
      duration_minutes: 30,
      notes: "Bring latest lab results",
      reminder_1day: true,
      reminder_1hour: true,
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAppointment,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/appointments/[id]/ical/route");
    const request = new Request(
      "http://localhost:3000/api/appointments/appt-1/ical"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "appt-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    expect(response.headers.get("Content-Disposition")).toContain(
      "attachment"
    );

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("END:VCALENDAR");
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("END:VEVENT");
    expect(body).toContain("SUMMARY:Doctor Visit - Dr. Smith");
    expect(body).toContain("LOCATION:123 Medical Blvd");
    expect(body).toContain("DESCRIPTION:Bring latest lab results");
    expect(body).toContain("DTSTART:20260420T140000Z");
    expect(body).toContain("DTEND:20260420T143000Z");
    // Check reminders
    expect(body).toContain("BEGIN:VALARM");
    expect(body).toContain("TRIGGER:-P1D");
    expect(body).toContain("TRIGGER:-PT1H");
  });

  it("returns 404 for non-existent appointment", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/appointments/[id]/ical/route");
    const request = new Request(
      "http://localhost:3000/api/appointments/nonexistent/ical"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("generates iCal without reminders when disabled", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mockAppointment = {
      id: "appt-2",
      title: "Quick Checkup",
      provider_name: null,
      provider_location: null,
      appointment_type: "doctor",
      date_time: "2026-05-01T09:00:00.000Z",
      duration_minutes: 15,
      notes: null,
      reminder_1day: false,
      reminder_1hour: false,
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAppointment,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/appointments/[id]/ical/route");
    const request = new Request(
      "http://localhost:3000/api/appointments/appt-2/ical"
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "appt-2" }),
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:Quick Checkup");
    expect(body).not.toContain("BEGIN:VALARM");
    expect(body).not.toContain("LOCATION:");
  });
});

// ── Page Components ─────────────────────────────────────────────────

describe("Appointments Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/appointments/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Add Appointment Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/appointments/add/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Dashboard Upcoming Appointments ─────────────────────────────────

describe("Upcoming Appointments Dashboard Component", () => {
  it("exports UpcomingAppointments component", async () => {
    const mod = await import("@/app/dashboard/upcoming-appointments");
    expect(mod.UpcomingAppointments).toBeDefined();
    expect(typeof mod.UpcomingAppointments).toBe("function");
  });
});
