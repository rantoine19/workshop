import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Health Profile API — New Fields ────────────────────────────────

describe("Health Profile API — GET returns new fields", () => {
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

  it("returns health profile fields for authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: "Test User",
              date_of_birth: "1990-01-15",
              gender: "male",
              avatar_url: null,
              height_inches: 72,
              known_conditions: ["Diabetes", "Hypertension"],
              medications: "Metformin",
              smoking_status: "none",
              family_history: ["Heart Disease"],
              activity_level: "moderate",
              sleep_hours: "7plus",
              updated_at: "2026-01-01T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.known_conditions).toEqual(["Diabetes", "Hypertension"]);
    expect(body.profile.medications).toBe("Metformin");
    expect(body.profile.smoking_status).toBe("none");
    expect(body.profile.family_history).toEqual(["Heart Disease"]);
    expect(body.profile.activity_level).toBe("moderate");
    expect(body.profile.sleep_hours).toBe("7plus");
  });

  it("returns default empty values for new user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116", message: "no rows" },
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/profile/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.known_conditions).toEqual([]);
    expect(body.profile.medications).toBeNull();
    expect(body.profile.smoking_status).toBeNull();
    expect(body.profile.family_history).toEqual([]);
    expect(body.profile.activity_level).toBeNull();
    expect(body.profile.sleep_hours).toBeNull();
  });
});

describe("Health Profile API — PUT validation", () => {
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

  function buildRequest(body?: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "invalid",
    });
  }

  it("rejects invalid smoking_status", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ smoking_status: "heavy" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("smoking_status");
  });

  it("rejects invalid activity_level", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ activity_level: "extreme" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("activity_level");
  });

  it("rejects invalid sleep_hours", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(buildRequest({ sleep_hours: "10" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("sleep_hours");
  });

  it("rejects invalid known_conditions values", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({ known_conditions: ["Diabetes", "FakeCondition"] })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("FakeCondition");
  });

  it("rejects invalid family_history values", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({ family_history: ["NotReal"] })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("NotReal");
  });

  it("rejects non-array known_conditions", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({ known_conditions: "Diabetes" })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("array");
  });

  it("accepts valid health profile fields", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-1",
              display_name: null,
              date_of_birth: null,
              gender: null,
              avatar_url: null,
              height_inches: null,
              known_conditions: ["Diabetes"],
              medications: "Metformin",
              smoking_status: "none",
              family_history: ["Heart Disease"],
              activity_level: "moderate",
              sleep_hours: "7plus",
              updated_at: "2026-04-08T00:00:00Z",
            },
            error: null,
          }),
        }),
      }),
    });

    const { PUT } = await import("@/app/api/profile/route");
    const response = await PUT(
      buildRequest({
        known_conditions: ["Diabetes"],
        medications: "Metformin",
        smoking_status: "none",
        family_history: ["Heart Disease"],
        activity_level: "moderate",
        sleep_hours: "7plus",
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile.known_conditions).toEqual(["Diabetes"]);
    expect(body.profile.smoking_status).toBe("none");
  });
});

// ── Health Context Builder ─────────────────────────────────────────

describe("buildHealthContext", () => {
  it("builds context string with all profile fields", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const context = buildHealthContext({
      gender: "male",
      date_of_birth: "1990-01-15",
      height_inches: 72,
      known_conditions: ["Diabetes", "Hypertension"],
      medications: "Metformin 500mg",
      smoking_status: "daily",
      family_history: ["Heart Disease", "Cancer"],
      activity_level: "sedentary",
      sleep_hours: "5_or_less",
    });

    expect(context).toContain("Gender: male");
    expect(context).toContain("Age:");
    expect(context).toContain("Height: 6'0\"");
    expect(context).toContain("Known conditions: Diabetes, Hypertension");
    expect(context).toContain("Medications: Metformin 500mg");
    expect(context).toContain("Smoking: daily");
    expect(context).toContain("Family history: Heart Disease, Cancer");
    expect(context).toContain("Activity: sedentary");
    expect(context).toContain("Sleep: 5_or_less");
    expect(context).toContain("personalize your responses");
  });

  it("returns empty string when no profile data", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const context = buildHealthContext({});
    expect(context).toBe("");
  });

  it("excludes smoking when status is none", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const context = buildHealthContext({
      gender: "female",
      smoking_status: "none",
    });

    expect(context).toContain("Gender: female");
    expect(context).not.toContain("Smoking");
  });

  it("excludes empty arrays", async () => {
    const { buildHealthContext } = await import("@/lib/claude/chat-prompts");

    const context = buildHealthContext({
      gender: "male",
      known_conditions: [],
      family_history: [],
    });

    expect(context).toContain("Gender: male");
    expect(context).not.toContain("Known conditions");
    expect(context).not.toContain("Family history");
  });
});
