import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── QuestionCard Component ──────────────────────────────────────────

describe("QuestionCard Component", () => {
  it("renders question text, category badge, and priority badge", async () => {
    const QuestionCard = (await import("@/components/doctor/QuestionCard"))
      .default;

    render(
      React.createElement(QuestionCard, {
        question: "What does my glucose level mean?",
        category: "clarifying",
        priority: "high",
      })
    );

    expect(
      screen.getByText("What does my glucose level mean?")
    ).toBeDefined();
    expect(screen.getByText("Clarifying")).toBeDefined();
    expect(screen.getByText("High Priority")).toBeDefined();
  });

  it("renders correct category labels for all categories", async () => {
    const QuestionCard = (await import("@/components/doctor/QuestionCard"))
      .default;

    const categories = [
      { value: "follow_up" as const, label: "Follow-up" },
      { value: "lifestyle" as const, label: "Lifestyle" },
      { value: "medication" as const, label: "Medication" },
    ];

    for (const { value, label } of categories) {
      const { unmount } = render(
        React.createElement(QuestionCard, {
          question: `Test question for ${value}`,
          category: value,
          priority: "medium",
        })
      );

      expect(screen.getByText(label)).toBeDefined();
      expect(screen.getByText("Medium Priority")).toBeDefined();
      unmount();
    }
  });

  it("applies priority-based CSS class", async () => {
    const QuestionCard = (await import("@/components/doctor/QuestionCard"))
      .default;

    const { container } = render(
      React.createElement(QuestionCard, {
        question: "Test",
        category: "clarifying",
        priority: "high",
      })
    );

    const card = container.firstElementChild;
    expect(card?.className).toContain("question-card--high");
  });
});

// ── QuestionList Component ──────────────────────────────────────────

describe("QuestionList Component", () => {
  it("renders questions grouped by category with correct headings", async () => {
    const QuestionList = (await import("@/components/doctor/QuestionList"))
      .default;

    const questions = [
      {
        question: "What is cholesterol?",
        category: "clarifying" as const,
        priority: "high" as const,
      },
      {
        question: "Should I exercise more?",
        category: "lifestyle" as const,
        priority: "medium" as const,
      },
      {
        question: "Do I need follow-up testing?",
        category: "follow_up" as const,
        priority: "low" as const,
      },
    ];

    render(React.createElement(QuestionList, { questions }));

    // Group headings
    expect(screen.getByText("Clarifying Questions")).toBeDefined();
    expect(screen.getByText("Lifestyle Questions")).toBeDefined();
    expect(screen.getByText("Follow-up Questions")).toBeDefined();

    // Question texts
    expect(screen.getByText("What is cholesterol?")).toBeDefined();
    expect(screen.getByText("Should I exercise more?")).toBeDefined();
    expect(screen.getByText("Do I need follow-up testing?")).toBeDefined();
  });

  it("shows empty state when no questions provided", async () => {
    const QuestionList = (await import("@/components/doctor/QuestionList"))
      .default;

    render(React.createElement(QuestionList, { questions: [] }));

    expect(
      screen.getByText("No questions were generated for this report.")
    ).toBeDefined();
  });

  it("only shows category headings for categories that have questions", async () => {
    const QuestionList = (await import("@/components/doctor/QuestionList"))
      .default;

    const questions = [
      {
        question: "Am I taking the right dose?",
        category: "medication" as const,
        priority: "high" as const,
      },
    ];

    render(React.createElement(QuestionList, { questions }));

    expect(screen.getByText("Medication Questions")).toBeDefined();
    expect(screen.queryByText("Clarifying Questions")).toBeNull();
    expect(screen.queryByText("Follow-up Questions")).toBeNull();
    expect(screen.queryByText("Lifestyle Questions")).toBeNull();
  });

  it("renders categories in correct order: clarifying, follow_up, lifestyle, medication", async () => {
    const QuestionList = (await import("@/components/doctor/QuestionList"))
      .default;

    const questions = [
      {
        question: "Q medication",
        category: "medication" as const,
        priority: "low" as const,
      },
      {
        question: "Q clarifying",
        category: "clarifying" as const,
        priority: "high" as const,
      },
      {
        question: "Q lifestyle",
        category: "lifestyle" as const,
        priority: "medium" as const,
      },
      {
        question: "Q follow_up",
        category: "follow_up" as const,
        priority: "medium" as const,
      },
    ];

    const { container } = render(
      React.createElement(QuestionList, { questions })
    );

    const headings = container.querySelectorAll(".question-list__group-title");
    expect(headings).toHaveLength(4);
    expect(headings[0].textContent).toBe("Clarifying Questions");
    expect(headings[1].textContent).toBe("Follow-up Questions");
    expect(headings[2].textContent).toBe("Lifestyle Questions");
    expect(headings[3].textContent).toBe("Medication Questions");
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

// ── Doctor Prep Layout ──────────────────────────────────────────────

describe("Doctor Prep Layout", () => {
  it("exports a default layout with force-dynamic", async () => {
    const mod = await import("@/app/reports/[id]/doctor-prep/layout");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});

// ── Doctor Prep Page — Rendered Integration Tests ───────────────────

describe("Doctor Prep Page — rendered", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(mockFetch);
    sessionStorage.clear();

    // Mock next/navigation useParams
    vi.doMock("next/navigation", () => ({
      useParams: () => ({ id: "report-123" }),
    }));
  });

  function mockSuccessfulFetch() {
    // First call: GET /api/reports/report-123
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        report: { parsed_result_id: "parsed-1" },
      }),
    });
    // Second call: POST /api/doctor-questions
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [
          {
            id: "q1",
            question: "What does my glucose level mean?",
            category: "clarifying",
            priority: "high",
          },
          {
            id: "q2",
            question: "Should I change my diet?",
            category: "lifestyle",
            priority: "medium",
          },
        ],
        disclaimer:
          "These questions are suggestions to help guide your conversation with your doctor.",
      }),
    });
  }

  it("renders disclaimer from API response", async () => {
    mockSuccessfulFetch();

    const { default: DoctorPrepPage } = await import(
      "@/app/reports/[id]/doctor-prep/page"
    );
    render(React.createElement(DoctorPrepPage));

    await waitFor(() => {
      expect(
        screen.getByText(
          "These questions are suggestions to help guide your conversation with your doctor."
        )
      ).toBeDefined();
    });

    // Verify it has role="alert" for accessibility
    const disclaimer = screen.getByRole("alert");
    expect(disclaimer).toBeDefined();
    expect(disclaimer.textContent).toContain("suggestions");
  });

  it("print button triggers window.print when clicked", async () => {
    mockSuccessfulFetch();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    const { default: DoctorPrepPage } = await import(
      "@/app/reports/[id]/doctor-prep/page"
    );
    render(React.createElement(DoctorPrepPage));

    await waitFor(() => {
      expect(screen.getByText("Print Questions")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Print Questions"));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it("save button bookmarks questions in sessionStorage", async () => {
    mockSuccessfulFetch();

    const { default: DoctorPrepPage } = await import(
      "@/app/reports/[id]/doctor-prep/page"
    );
    render(React.createElement(DoctorPrepPage));

    await waitFor(() => {
      expect(screen.getByText("Save for Later")).toBeDefined();
    });

    // Click save
    fireEvent.click(screen.getByText("Save for Later"));

    // Button should change to "Saved"
    expect(screen.getByText("Saved")).toBeDefined();

    // sessionStorage should have the questions
    const stored = sessionStorage.getItem("doctor-prep-saved-report-123");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].question).toBe("What does my glucose level mean?");

    // Click unsave
    fireEvent.click(screen.getByText("Saved"));
    expect(screen.getByText("Save for Later")).toBeDefined();
    expect(
      sessionStorage.getItem("doctor-prep-saved-report-123")
    ).toBeNull();
  });

  it("renders questions from API in the page", async () => {
    mockSuccessfulFetch();

    const { default: DoctorPrepPage } = await import(
      "@/app/reports/[id]/doctor-prep/page"
    );
    render(React.createElement(DoctorPrepPage));

    await waitFor(() => {
      expect(
        screen.getByText("What does my glucose level mean?")
      ).toBeDefined();
    });

    expect(screen.getByText("Should I change my diet?")).toBeDefined();
    expect(screen.getByText("Clarifying Questions")).toBeDefined();
    expect(screen.getByText("Lifestyle Questions")).toBeDefined();
  });

  it("shows loading state initially", async () => {
    // Don't resolve fetch — keep it pending
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { default: DoctorPrepPage } = await import(
      "@/app/reports/[id]/doctor-prep/page"
    );
    render(React.createElement(DoctorPrepPage));

    expect(
      screen.getByText("Generating questions for your doctor visit...")
    ).toBeDefined();
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });

    const { default: DoctorPrepPage } = await import(
      "@/app/reports/[id]/doctor-prep/page"
    );
    render(React.createElement(DoctorPrepPage));

    await waitFor(() => {
      expect(screen.getByText("Report not found")).toBeDefined();
    });

    expect(screen.getByText("Try Again")).toBeDefined();
  });
});
