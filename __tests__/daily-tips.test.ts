import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DAILY_TIPS,
  TIP_COUNT,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  VALID_TIP_ACTIONS,
  getCategoriesFromBiomarkers,
  getPersonalizedPool,
  selectDailyTip,
  groupTipsByCategory,
  computeStreak,
  dayOfYear,
  type DailyTip,
  type UserContext,
  type TipCategory,
} from "@/lib/health/daily-tips";

// ── Tip Library Shape ─────────────────────────────────────────

describe("Daily Tips Library", () => {
  it("has 200+ tips", () => {
    expect(DAILY_TIPS.length).toBeGreaterThanOrEqual(200);
    expect(TIP_COUNT).toBe(DAILY_TIPS.length);
  });

  it("has tips across many categories", () => {
    const cats = new Set(DAILY_TIPS.map((t) => t.category));
    expect(cats.size).toBeGreaterThanOrEqual(15);
  });

  it("includes all expected category labels", () => {
    expect(CATEGORY_LABELS.cholesterol).toBe("Cholesterol & Lipids");
    expect(CATEGORY_LABELS.glucose).toBe("Glucose & Blood Sugar");
    expect(CATEGORY_LABELS.smoking).toBe("Smoking Cessation");
    expect(CATEGORY_LABELS.gut).toBe("Gut Health");
  });

  it("every tip has a non-empty id, category, text, and emoji", () => {
    for (const tip of DAILY_TIPS) {
      expect(tip.id).toBeTruthy();
      expect(typeof tip.id).toBe("string");
      expect(tip.category).toBeTruthy();
      expect(typeof tip.text).toBe("string");
      expect(tip.text.length).toBeGreaterThan(0);
      expect(tip.emoji).toBeTruthy();
    }
  });

  it("every tip id is unique", () => {
    const ids = DAILY_TIPS.map((t) => t.id);
    const uniq = new Set(ids);
    expect(uniq.size).toBe(ids.length);
  });

  it("emoji matches category emoji map", () => {
    for (const tip of DAILY_TIPS) {
      expect(tip.emoji).toBe(CATEGORY_EMOJIS[tip.category]);
    }
  });

  it("has at least 10 tips in each major category", () => {
    const majorCategories: TipCategory[] = [
      "cholesterol",
      "glucose",
      "blood_pressure",
      "heart",
      "sleep",
      "stress",
      "nutrition",
      "exercise",
    ];
    for (const cat of majorCategories) {
      const tips = DAILY_TIPS.filter((t) => t.category === cat);
      expect(tips.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("evidence levels are valid when present", () => {
    const valid = ["strong", "moderate", "emerging"];
    for (const tip of DAILY_TIPS) {
      if (tip.evidenceLevel) {
        expect(valid).toContain(tip.evidenceLevel);
      }
    }
  });
});

// ── Biomarker → Category Mapping ─────────────────────────────

describe("getCategoriesFromBiomarkers", () => {
  it("maps LDL/HDL to cholesterol", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "LDL Cholesterol", flag: "red" },
    ]);
    expect(cats).toContain("cholesterol");
  });

  it("maps A1C to glucose", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "HbA1c", flag: "yellow" },
    ]);
    expect(cats).toContain("glucose");
  });

  it("maps systolic blood pressure to blood_pressure", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "Systolic BP", flag: "red" },
    ]);
    expect(cats).toContain("blood_pressure");
  });

  it("maps ALT/AST to liver", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "ALT", flag: "yellow" },
      { name: "AST", flag: "yellow" },
    ]);
    expect(cats).toContain("liver");
  });

  it("maps creatinine to kidney", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "Creatinine", flag: "red" },
    ]);
    expect(cats).toContain("kidney");
  });

  it("returns empty array for unknown markers", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "Made Up Marker", flag: "red" },
    ]);
    expect(cats).toEqual([]);
  });

  it("deduplicates categories", () => {
    const cats = getCategoriesFromBiomarkers([
      { name: "LDL", flag: "red" },
      { name: "HDL", flag: "yellow" },
      { name: "Triglycerides", flag: "red" },
    ]);
    const counts = cats.filter((c) => c === "cholesterol").length;
    expect(counts).toBe(1);
  });
});

// ── Personalization ──────────────────────────────────────────

describe("Personalization", () => {
  it("filters tips that don't match user age", () => {
    const ctx: UserContext = { age: 30 };
    const pool = getPersonalizedPool(ctx);
    // No tips should require age > 30 to be in pool
    for (const tip of pool) {
      if (typeof tip.ageMin === "number") {
        expect(tip.ageMin).toBeLessThanOrEqual(30);
      }
    }
  });

  it("filters tips marked for opposite gender", () => {
    const ctx: UserContext = { gender: "male" };
    const pool = getPersonalizedPool(ctx);
    for (const tip of pool) {
      if (tip.gender) {
        expect(tip.gender).toBe("male");
      }
    }
  });

  it("smokers see smoking-cessation tips ranked highly", () => {
    const ctx: UserContext = { smokingStatus: "daily" };
    const pool = getPersonalizedPool(ctx);
    const smokingTips = pool.filter((t) => t.category === "smoking");
    expect(smokingTips.length).toBeGreaterThan(0);
    // Top of the pool should be a smoking tip (high score)
    const top5 = pool.slice(0, 5);
    const hasSmokingInTop = top5.some((t) => t.category === "smoking");
    expect(hasSmokingInTop).toBe(true);
  });

  it("non-smokers don't see smoking-cessation tips", () => {
    const ctx: UserContext = { smokingStatus: "none" };
    const pool = getPersonalizedPool(ctx);
    const smokingTips = pool.filter((t) => t.category === "smoking");
    expect(smokingTips.length).toBe(0);
  });

  it("sedentary users get exercise tips prioritized", () => {
    const ctx: UserContext = { activityLevel: "sedentary" };
    const pool = getPersonalizedPool(ctx);
    const top10 = pool.slice(0, 10);
    const hasExerciseInTop = top10.some((t) => t.category === "exercise");
    expect(hasExerciseInTop).toBe(true);
  });

  it("users with high cholesterol concern get cholesterol tips up top", () => {
    const ctx: UserContext = {
      concerns: [{ name: "LDL Cholesterol", flag: "red" }],
    };
    const pool = getPersonalizedPool(ctx);
    const top10 = pool.slice(0, 10);
    const hasChol = top10.some((t) => t.category === "cholesterol");
    expect(hasChol).toBe(true);
  });

  it("users with diabetes condition prefer glucose-targeted tips", () => {
    const ctx: UserContext = { conditions: ["Diabetes"] };
    const pool = getPersonalizedPool(ctx);
    // Glucose tips targeted at diabetes condition should appear
    const top20 = pool.slice(0, 20);
    const hasGlucoseTip = top20.some((t) => t.category === "glucose");
    expect(hasGlucoseTip).toBe(true);
  });

  it("excludes dismissed tip ids from the pool", () => {
    const allTips = getPersonalizedPool({});
    const sample = allTips.slice(0, 5).map((t) => t.id);
    const filtered = getPersonalizedPool({ dismissedTipIds: sample });
    for (const id of sample) {
      expect(filtered.find((t) => t.id === id)).toBeUndefined();
    }
  });

  it("poor sleepers get sleep tips prioritized", () => {
    const ctx: UserContext = { sleepHours: "5_or_less" };
    const pool = getPersonalizedPool(ctx);
    const top15 = pool.slice(0, 15);
    const hasSleep = top15.some((t) => t.category === "sleep");
    expect(hasSleep).toBe(true);
  });
});

// ── selectDailyTip ───────────────────────────────────────────

describe("selectDailyTip", () => {
  it("returns a tip with a SelectionResult", () => {
    const result = selectDailyTip({});
    expect(result).not.toBeNull();
    expect(result!.tip).toBeDefined();
    expect(result!.tip.id).toBeTruthy();
    expect(Array.isArray(result!.reasons)).toBe(true);
  });

  it("returns null only when the pool is empty (impossible with seed library)", () => {
    // Even with everything dismissed, smoking-only would still leave...
    const result = selectDailyTip({});
    expect(result).not.toBeNull();
  });

  it("offset cycles through different tips", () => {
    const r1 = selectDailyTip({}, 0);
    const r2 = selectDailyTip({}, 1);
    const r3 = selectDailyTip({}, 2);
    expect(r1!.tip.id).not.toBe(r2!.tip.id);
    // r1 and r3 may both come from top-pool — but their indices differ
    expect(r2!.tip.id).not.toBe(r3!.tip.id);
  });

  it("provides personalization reason when concerns match category", () => {
    const result = selectDailyTip({
      concerns: [{ name: "LDL Cholesterol", flag: "red" }],
    });
    expect(result).not.toBeNull();
    // The top-scored tip should be cholesterol-related with a reason text
    expect(result!.tip.category).toBe("cholesterol");
    expect(result!.reasons.length).toBeGreaterThan(0);
    expect(result!.reasons[0]).toMatch(/LDL Cholesterol|Cholesterol/);
  });
});

// ── Streak Calculation ───────────────────────────────────────

describe("computeStreak", () => {
  it("returns 0 for empty input", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("returns 1 for a single completion today", () => {
    const today = new Date().toISOString();
    expect(computeStreak([today])).toBe(1);
  });

  it("returns 0 when last completion is 3 days ago", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(computeStreak([threeDaysAgo])).toBe(0);
  });

  it("counts consecutive days", () => {
    const now = Date.now();
    const today = new Date(now).toISOString();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeStreak([today, yesterday, twoDaysAgo])).toBeGreaterThanOrEqual(2);
  });

  it("ignores invalid timestamps gracefully", () => {
    expect(computeStreak(["not-a-date", "also-bad"])).toBe(0);
  });

  it("multiple completions on same day count as one streak day", () => {
    const now = Date.now();
    const today1 = new Date(now).toISOString();
    const today2 = new Date(now - 60 * 60 * 1000).toISOString();
    expect(computeStreak([today1, today2])).toBe(1);
  });
});

// ── Group Tips ───────────────────────────────────────────────

describe("groupTipsByCategory", () => {
  it("returns groups keyed by category", () => {
    const groups = groupTipsByCategory();
    expect(groups.cholesterol).toBeDefined();
    expect(groups.cholesterol.length).toBeGreaterThan(0);
    expect(groups.exercise).toBeDefined();
  });

  it("can group a custom subset", () => {
    const subset: DailyTip[] = DAILY_TIPS.slice(0, 5);
    const groups = groupTipsByCategory(subset);
    // Total tips across all groups = subset length
    let total = 0;
    for (const cat of Object.keys(groups) as TipCategory[]) {
      total += groups[cat].length;
    }
    expect(total).toBe(5);
  });
});

// ── Utility ──────────────────────────────────────────────────

describe("dayOfYear", () => {
  it("returns a value between 1 and 366", () => {
    const d = dayOfYear();
    expect(d).toBeGreaterThanOrEqual(1);
    expect(d).toBeLessThanOrEqual(366);
  });

  it("returns 1 on Jan 1", () => {
    const jan1 = new Date(2026, 0, 1);
    expect(dayOfYear(jan1)).toBe(1);
  });
});

// ── Valid Actions Export ─────────────────────────────────────

describe("VALID_TIP_ACTIONS", () => {
  it("includes all required actions", () => {
    expect(VALID_TIP_ACTIONS).toContain("viewed");
    expect(VALID_TIP_ACTIONS).toContain("helpful");
    expect(VALID_TIP_ACTIONS).toContain("not_helpful");
    expect(VALID_TIP_ACTIONS).toContain("completed");
    expect(VALID_TIP_ACTIONS).toContain("favorited");
    expect(VALID_TIP_ACTIONS).toContain("dismissed");
  });
});

// ── API Route ────────────────────────────────────────────────

describe("Tip Interactions API Route", () => {
  it("exports GET, POST, and DELETE handlers", async () => {
    const mod = await import("@/app/api/tips/interactions/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
    expect(mod.DELETE).toBeDefined();
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("Tip Interactions API — auth + validation", () => {
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

  it("GET returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip_id: "x", action: "viewed" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST rejects invalid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST rejects missing tip_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewed" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/tip_id/);
  });

  it("POST rejects invalid action", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { POST } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip_id: "chol-001", action: "exploded" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid action/);
  });

  it("POST accepts a valid completed interaction", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "row-1",
              user_id: "u1",
              tip_id: "chol-001",
              action: "completed",
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    });

    const { POST } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip_id: "chol-001", action: "completed" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.interaction).toBeDefined();
    expect(json.interaction.action).toBe("completed");
  });

  it("GET returns favorites/dismissed/completedToday/streak from rows", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const now = Date.now();
    const todayIso = new Date(now).toISOString();

    // Order matters — handler reverses to walk oldest-first
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                { tip_id: "chol-001", action: "completed", created_at: todayIso },
                { tip_id: "chol-001", action: "favorited", created_at: todayIso },
                { tip_id: "chol-002", action: "dismissed", created_at: todayIso },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("@/app/api/tips/interactions/route");
    const req = new Request("http://localhost:3000/api/tips/interactions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toContain("chol-001");
    expect(json.dismissed).toContain("chol-002");
    expect(json.completedToday).toContain("chol-001");
    expect(json.streak).toBeGreaterThanOrEqual(1);
  });

  it("DELETE rejects invalid action filter", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { DELETE } = await import("@/app/api/tips/interactions/route");
    const req = new Request(
      "http://localhost:3000/api/tips/interactions?action=bogus",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});

// ── Component Smoke Tests ────────────────────────────────────

describe("DailyTip dashboard component", () => {
  it("exports DailyTip as a named export", async () => {
    const mod = await import("@/app/dashboard/daily-tip");
    expect(mod.DailyTip).toBeDefined();
    expect(typeof mod.DailyTip).toBe("function");
  });
});

describe("Tips browse page", () => {
  it("exports a default page component", async () => {
    const mod = await import("@/app/tips/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});
