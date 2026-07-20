import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  STANDARD_GOALS,
  calculateProgress,
  getGoalById,
  isAchieved,
  type StandardGoal,
} from "@/lib/health/standard-goals";
import {
  buildGoalsContext,
  buildHealthContext,
} from "@/lib/claude/chat-prompts";

// ── STANDARD_GOALS library ─────────────────────────────────────────

describe("STANDARD_GOALS library", () => {
  it("defines exactly 6 standard goals", () => {
    expect(STANDARD_GOALS).toHaveLength(6);
  });

  it("gives every goal the required fields", () => {
    for (const g of STANDARD_GOALS) {
      expect(g.id).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.description).toBeTruthy();
      expect(g.targetBiomarker).toBeTruthy();
      expect(typeof g.targetValue).toBe("number");
      expect(g.direction).toMatch(/^(lower|higher)$/);
      expect(g.emoji).toBeTruthy();
      expect(g.unit).toBeDefined();
    }
  });

  it("has unique ids for each goal", () => {
    const ids = STANDARD_GOALS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the six ticket-mandated goal ids", () => {
    const ids = STANDARD_GOALS.map((g) => g.id).sort();
    expect(ids).toEqual(
      [
        "boost_health_score",
        "control_blood_sugar",
        "improve_blood_pressure",
        "lower_cholesterol",
        "lower_triglycerides",
        "raise_hdl",
      ].sort()
    );
  });
});

// ── getGoalById ─────────────────────────────────────────────────────

describe("getGoalById", () => {
  it("returns the matching goal", () => {
    const g = getGoalById("lower_cholesterol");
    expect(g).toBeTruthy();
    expect(g?.targetValue).toBe(200);
  });

  it("returns null for unknown ids", () => {
    expect(getGoalById("does_not_exist")).toBeNull();
  });
});

// ── calculateProgress ──────────────────────────────────────────────

describe("calculateProgress — lower direction", () => {
  const goal: StandardGoal = {
    id: "lower_cholesterol",
    title: "Lower my cholesterol",
    description: "",
    targetBiomarker: "Total Cholesterol",
    targetValue: 200,
    direction: "lower",
    unit: "mg/dL",
    emoji: "❤️",
  };

  it("returns 0 when no starting value and not yet achieved", () => {
    expect(calculateProgress(goal, 240, null)).toBe(0);
  });

  it("returns 100 once the target is crossed", () => {
    expect(calculateProgress(goal, 199, 240)).toBe(100);
  });

  it("computes proportional progress between start and target", () => {
    // start 240, target 200, current 220 → 50%
    expect(calculateProgress(goal, 220, 240)).toBe(50);
  });

  it("clamps to 0 when regressing above starting value", () => {
    expect(calculateProgress(goal, 260, 240)).toBe(0);
  });

  it("returns 100 when starting was already below target and now still below", () => {
    // Goal already met at activation — keeps 100%.
    expect(calculateProgress(goal, 180, 190)).toBe(100);
  });
});

describe("calculateProgress — higher direction", () => {
  const goal: StandardGoal = {
    id: "raise_hdl",
    title: "Raise HDL",
    description: "",
    targetBiomarker: "HDL Cholesterol",
    targetValue: 60,
    direction: "higher",
    unit: "mg/dL",
    emoji: "💚",
  };

  it("returns 100 when current value hits or exceeds target", () => {
    expect(calculateProgress(goal, 60, 40)).toBe(100);
    expect(calculateProgress(goal, 70, 40)).toBe(100);
  });

  it("computes proportional progress upward", () => {
    // start 40, target 60, current 50 → 50%
    expect(calculateProgress(goal, 50, 40)).toBe(50);
  });

  it("clamps to 0 when regressing below starting value", () => {
    expect(calculateProgress(goal, 30, 40)).toBe(0);
  });
});

// ── isAchieved ─────────────────────────────────────────────────────

describe("isAchieved", () => {
  it("returns true when a lower goal reaches or crosses its target", () => {
    const goal: StandardGoal = {
      id: "x",
      title: "",
      description: "",
      targetBiomarker: "",
      targetValue: 200,
      direction: "lower",
      unit: "",
      emoji: "",
    };
    expect(isAchieved(goal, 200)).toBe(true);
    expect(isAchieved(goal, 199)).toBe(true);
    expect(isAchieved(goal, 201)).toBe(false);
  });

  it("returns true when a higher goal reaches or crosses its target", () => {
    const goal: StandardGoal = {
      id: "x",
      title: "",
      description: "",
      targetBiomarker: "",
      targetValue: 60,
      direction: "higher",
      unit: "",
      emoji: "",
    };
    expect(isAchieved(goal, 60)).toBe(true);
    expect(isAchieved(goal, 61)).toBe(true);
    expect(isAchieved(goal, 59)).toBe(false);
  });
});

// ── Chat context integration ───────────────────────────────────────

describe("buildGoalsContext", () => {
  it("returns an empty string when no active goals", () => {
    expect(buildGoalsContext([])).toBe("");
  });

  it("summarizes active goals with progress and target", () => {
    const goal = getGoalById("lower_cholesterol")!;
    const ctx = buildGoalsContext([
      { goal, progress: 75, currentValue: 210 },
    ]);
    expect(ctx).toContain("User's active health goals");
    expect(ctx).toContain("Lower my cholesterol");
    expect(ctx).toContain("75%");
    expect(ctx).toContain("210");
    expect(ctx).toContain("target <200");
  });
});

describe("buildHealthContext includes active goals", () => {
  it("appends the goals block when active goals are provided", () => {
    const goal = getGoalById("raise_hdl")!;
    const output = buildHealthContext(
      { gender: "Male" },
      [],
      [{ goal, progress: 40, currentValue: 45 }]
    );
    expect(output).toContain("Gender: Male");
    expect(output).toContain("User's active health goals");
    expect(output).toContain("Raise my good cholesterol");
  });

  it("omits the goals block when no active goals are provided", () => {
    const output = buildHealthContext({ gender: "Female" }, []);
    expect(output).not.toContain("User's active health goals");
  });
});

// ── API route — route handler exports ──────────────────────────────

describe("Goals API Route", () => {
  it("exports GET and POST handlers", async () => {
    const mod = await import("@/app/api/goals/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
  });
});

describe("Single Goal API Route", () => {
  it("exports PUT and DELETE handlers", async () => {
    const mod = await import("@/app/api/goals/[id]/route");
    expect(mod.PUT).toBeDefined();
    expect(mod.DELETE).toBeDefined();
  });
});

// ── Goals API — GET ────────────────────────────────────────────────

describe("Goals API — GET", () => {
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

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { GET } = await import("@/app/api/goals/route");
    const res = await GET(new Request("http://localhost:3000/api/goals"));
    expect(res.status).toBe(401);
  });
});

// ── Goals API — POST ───────────────────────────────────────────────

describe("Goals API — POST", () => {
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

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/goals/route");
    const res = await POST(
      new Request("http://localhost:3000/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: "lower_cholesterol" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for an unknown goal_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { POST } = await import("@/app/api/goals/route");
    const res = await POST(
      new Request("http://localhost:3000/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: "does_not_exist" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unknown");
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { POST } = await import("@/app/api/goals/route");
    const res = await POST(
      new Request("http://localhost:3000/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      })
    );
    expect(res.status).toBe(400);
  });
});

// ── Single Goal API — PUT / DELETE ─────────────────────────────────

describe("Single Goal API — PUT/DELETE auth", () => {
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

  it("returns 401 for PUT when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { PUT } = await import("@/app/api/goals/[id]/route");
    const res = await PUT(
      new Request("http://localhost:3000/api/goals/g-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      }),
      { params: Promise.resolve({ id: "g-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for PUT with invalid status", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const { PUT } = await import("@/app/api/goals/[id]/route");
    const res = await PUT(
      new Request("http://localhost:3000/api/goals/g-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "bogus" }),
      }),
      { params: Promise.resolve({ id: "g-1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 for DELETE when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { DELETE } = await import("@/app/api/goals/[id]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/goals/g-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "g-1" }) }
    );
    expect(res.status).toBe(401);
  });
});

// ── Page + component wiring ────────────────────────────────────────

describe("Goals Page components", () => {
  it("exports a default Goals page component", async () => {
    const mod = await import("@/app/goals/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("exports a Goals layout that forces dynamic rendering", async () => {
    const mod = await import("@/app/goals/layout");
    expect(mod.default).toBeDefined();
    expect(mod.dynamic).toBe("force-dynamic");
  });

  it("exports the ActiveGoals dashboard card", async () => {
    const mod = await import("@/app/dashboard/active-goals");
    expect(mod.ActiveGoals).toBeDefined();
  });

  it("exports the GoalAchievementBanner", async () => {
    const mod = await import("@/app/dashboard/goal-achievement-banner");
    expect(mod.GoalAchievementBanner).toBeDefined();
  });
});

// ── refreshGoalsForUser (parse-route integration surface) ──────────

describe("refreshGoalsForUser", () => {
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFrom = vi.fn();
  });

  it("returns [] when the user has no active goals", async () => {
    const eqActive = vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: eqActive }),
      }),
    });

    const { refreshGoalsForUser } = await import(
      "@/lib/health/goal-progress"
    );
    const supabase = { from: mockFrom } as unknown as Parameters<
      typeof refreshGoalsForUser
    >[0];
    const result = await refreshGoalsForUser(supabase, "user-1", null);
    expect(result).toEqual([]);
  });
});
