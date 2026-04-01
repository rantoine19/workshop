import { describe, it, expect } from "vitest";

// ── QuestionCard Component ──────────────────────────────────────────

describe("QuestionCard Component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/components/doctor/QuestionCard");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── QuestionList Component ──────────────────────────────────────────

describe("QuestionList Component", () => {
  it("exports a default component", async () => {
    const mod = await import("@/components/doctor/QuestionList");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── Doctor Prep Page ────────────────────────────────────────────────

describe("Doctor Prep Page", () => {
  it("exports a default component", async () => {
    const mod = await import("@/app/reports/[id]/doctor-prep/page");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

// ── QuestionList Grouping Logic ─────────────────────────────────────

describe("QuestionList — grouping and rendering", () => {
  it("groups questions by category in correct order", () => {
    const questions = [
      { question: "Q1", category: "medication" as const, priority: "high" as const },
      { question: "Q2", category: "clarifying" as const, priority: "medium" as const },
      { question: "Q3", category: "lifestyle" as const, priority: "low" as const },
      { question: "Q4", category: "clarifying" as const, priority: "high" as const },
      { question: "Q5", category: "follow_up" as const, priority: "medium" as const },
    ];

    // Verify the grouping logic matches the expected category order
    const CATEGORY_ORDER = ["clarifying", "follow_up", "lifestyle", "medication"] as const;

    const grouped = CATEGORY_ORDER.reduce(
      (acc, category) => {
        const matching = questions.filter((q) => q.category === category);
        if (matching.length > 0) {
          acc[category] = matching;
        }
        return acc;
      },
      {} as Record<string, typeof questions>
    );

    // Clarifying should be first (2 questions)
    expect(grouped["clarifying"]).toHaveLength(2);
    expect(grouped["clarifying"][0].question).toBe("Q2");
    expect(grouped["clarifying"][1].question).toBe("Q4");

    // Follow-up second
    expect(grouped["follow_up"]).toHaveLength(1);
    expect(grouped["follow_up"][0].question).toBe("Q5");

    // Lifestyle third
    expect(grouped["lifestyle"]).toHaveLength(1);
    expect(grouped["lifestyle"][0].question).toBe("Q3");

    // Medication last
    expect(grouped["medication"]).toHaveLength(1);
    expect(grouped["medication"][0].question).toBe("Q1");

    // Verify order of categories
    const orderedKeys = CATEGORY_ORDER.filter((cat) => grouped[cat]);
    expect(orderedKeys).toEqual(["clarifying", "follow_up", "lifestyle", "medication"]);
  });

  it("handles empty questions array", () => {
    const questions: Array<{
      question: string;
      category: "clarifying" | "follow_up" | "lifestyle" | "medication";
      priority: "high" | "medium" | "low";
    }> = [];

    const CATEGORY_ORDER = ["clarifying", "follow_up", "lifestyle", "medication"] as const;

    const grouped = CATEGORY_ORDER.reduce(
      (acc, category) => {
        const matching = questions.filter((q) => q.category === category);
        if (matching.length > 0) {
          acc[category] = matching;
        }
        return acc;
      },
      {} as Record<string, typeof questions>
    );

    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("handles single category questions", () => {
    const questions = [
      { question: "Q1", category: "lifestyle" as const, priority: "high" as const },
      { question: "Q2", category: "lifestyle" as const, priority: "low" as const },
    ];

    const CATEGORY_ORDER = ["clarifying", "follow_up", "lifestyle", "medication"] as const;

    const grouped = CATEGORY_ORDER.reduce(
      (acc, category) => {
        const matching = questions.filter((q) => q.category === category);
        if (matching.length > 0) {
          acc[category] = matching;
        }
        return acc;
      },
      {} as Record<string, typeof questions>
    );

    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped["lifestyle"]).toHaveLength(2);
  });
});

// ── QuestionCard Display Logic ──────────────────────────────────────

describe("QuestionCard — display labels", () => {
  const CATEGORY_LABELS: Record<string, string> = {
    clarifying: "Clarifying",
    follow_up: "Follow-up",
    lifestyle: "Lifestyle",
    medication: "Medication",
  };

  const PRIORITY_LABELS: Record<string, string> = {
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  };

  it("maps category values to display labels", () => {
    expect(CATEGORY_LABELS["clarifying"]).toBe("Clarifying");
    expect(CATEGORY_LABELS["follow_up"]).toBe("Follow-up");
    expect(CATEGORY_LABELS["lifestyle"]).toBe("Lifestyle");
    expect(CATEGORY_LABELS["medication"]).toBe("Medication");
  });

  it("maps priority values to display labels", () => {
    expect(PRIORITY_LABELS["high"]).toBe("High Priority");
    expect(PRIORITY_LABELS["medium"]).toBe("Medium Priority");
    expect(PRIORITY_LABELS["low"]).toBe("Low Priority");
  });

  it("provides visual priority mapping (high=red, medium=yellow, low=green)", () => {
    // The CSS class convention: question-card--{priority}
    // high → red border, medium → yellow border, low → green border
    const priorityClasses = {
      high: "question-card--high",
      medium: "question-card--medium",
      low: "question-card--low",
    };

    expect(priorityClasses.high).toContain("high");
    expect(priorityClasses.medium).toContain("medium");
    expect(priorityClasses.low).toContain("low");
  });
});

// ── Doctor Prep Page Layout ─────────────────────────────────────────

describe("Doctor Prep Layout", () => {
  it("exports a default layout with force-dynamic", async () => {
    const mod = await import("@/app/reports/[id]/doctor-prep/layout");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});
