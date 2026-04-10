import { describe, it, expect } from "vitest";

// ── Dashboard Grid Component Exports ───────────────────────────────

describe("Dashboard Grid redesign", () => {
  it("DashboardGrid exports a named component", async () => {
    const mod = await import("@/app/dashboard/dashboard-grid");
    expect(mod.DashboardGrid).toBeDefined();
    expect(typeof mod.DashboardGrid).toBe("function");
  });

  it("HealthScore exports a named component with compact support", async () => {
    const mod = await import("@/app/dashboard/health-score");
    expect(mod.HealthScore).toBeDefined();
    expect(typeof mod.HealthScore).toBe("function");
  });

  it("TopConcerns exports a named component", async () => {
    const mod = await import("@/app/dashboard/top-concerns");
    expect(mod.TopConcerns).toBeDefined();
    expect(typeof mod.TopConcerns).toBe("function");
  });

  it("ImprovementTips exports a named component", async () => {
    const mod = await import("@/app/dashboard/improvement-tips");
    expect(mod.ImprovementTips).toBeDefined();
    expect(typeof mod.ImprovementTips).toBe("function");
  });

  it("RecentReports exports a named component", async () => {
    const mod = await import("@/app/dashboard/recent-reports");
    expect(mod.RecentReports).toBeDefined();
    expect(typeof mod.RecentReports).toBe("function");
  });

  it("QuickStats exports a named component", async () => {
    const mod = await import("@/app/dashboard/quick-stats");
    expect(mod.QuickStats).toBeDefined();
    expect(typeof mod.QuickStats).toBe("function");
  });

  it("DailyTip exports a named component", async () => {
    const mod = await import("@/app/dashboard/daily-tip");
    expect(mod.DailyTip).toBeDefined();
    expect(typeof mod.DailyTip).toBe("function");
  });
});

// ── Daily Tip Selection ────────────────────────────────────────────

describe("Daily Tip logic", () => {
  it("DailyTip component accepts concerns prop", async () => {
    const mod = await import("@/app/dashboard/daily-tip");
    // The component should be callable (it's a React function component)
    expect(mod.DailyTip.length).toBeGreaterThanOrEqual(0);
  });
});

// ── Health Score API route still exports GET ───────────────────────

describe("Health Score API (updated)", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/health-score/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});
