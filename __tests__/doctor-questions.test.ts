import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Doctor Question Prompts ─────────────────────────────────────────

describe("Doctor Question Prompts", () => {
  it("exports system prompt, user prompt, and formatter", async () => {
    const mod = await import("@/lib/claude/doctor-prompts");
    expect(mod.DOCTOR_QUESTIONS_SYSTEM_PROMPT).toBeDefined();
    expect(mod.DOCTOR_QUESTIONS_USER_PROMPT).toBeDefined();
    expect(mod.formatDataForDoctorQuestions).toBeDefined();
  });

  it("system prompt requires patient-to-doctor phrasing", async () => {
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain("PATIENT to ask their DOCTOR");
  });

  it("system prompt prohibits assuming diagnoses", async () => {
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain("Do NOT generate questions that assume a diagnosis");
  });

  it("system prompt limits to 10 questions", async () => {
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain("MAXIMUM of 10 questions");
  });

  it("system prompt requires all four categories", async () => {
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"clarifying"');
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"follow_up"');
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"lifestyle"');
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"medication"');
  });

  it("system prompt requires all three priority levels", async () => {
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"high"');
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"medium"');
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain('"low"');
  });

  it("system prompt includes disclaimer text", async () => {
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain("suggestions to help guide");
  });

  it("formatDataForDoctorQuestions formats biomarkers and risk flags", async () => {
    const { formatDataForDoctorQuestions } = await import(
      "@/lib/claude/doctor-prompts"
    );

    const result = formatDataForDoctorQuestions(
      [
        {
          name: "Glucose",
          value: 85,
          unit: "mg/dL",
          reference_low: 70,
          reference_high: 100,
          flag: "green",
        },
        {
          name: "Cholesterol",
          value: 250,
          unit: "mg/dL",
          reference_low: 125,
          reference_high: 200,
          flag: "red",
        },
      ],
      [
        { biomarker_name: "Cholesterol", flag: "red", trend: "worsening" },
        { biomarker_name: "Glucose", flag: "green", trend: "stable" },
      ]
    );

    expect(result).toContain("Glucose: 85 mg/dL");
    expect(result).toContain("Cholesterol: 250 mg/dL");
    expect(result).toContain("Abnormal Results:");
    expect(result).toContain("Cholesterol: red flag, trend: worsening");
    // Green flags should NOT appear in abnormal results section
    expect(result).not.toContain("Glucose: green flag");
  });

  it("formatDataForDoctorQuestions omits abnormal section when all green", async () => {
    const { formatDataForDoctorQuestions } = await import(
      "@/lib/claude/doctor-prompts"
    );

    const result = formatDataForDoctorQuestions(
      [
        {
          name: "Glucose",
          value: 85,
          unit: "mg/dL",
          reference_low: 70,
          reference_high: 100,
          flag: "green",
        },
      ],
      [{ biomarker_name: "Glucose", flag: "green", trend: "stable" }]
    );

    expect(result).toContain("Biomarkers:");
    expect(result).not.toContain("Abnormal Results:");
  });
});

// ── Doctor Questions API Route ──────────────────────────────────────

describe("Doctor Questions API Route", () => {
  it("exports a POST handler", async () => {
    const mod = await import("@/app/api/doctor-questions/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });
});

// ── Doctor Questions API Contract ───────────────────────────────────

describe("Doctor Questions API Contract", () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockMessagesCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockMessagesCreate = vi.fn();

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({
        auth: { getUser: mockGetUser },
        from: mockFrom,
      }),
    }));

    vi.doMock("@/lib/claude/client", () => ({
      getClaudeClient: vi.fn().mockReturnValue({
        messages: { create: mockMessagesCreate },
      }),
    }));
  });

  function buildRequest(body?: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/doctor-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "invalid",
    });
  }

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(
      buildRequest({ parsed_result_id: "pr-1" })
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(
      new Request("http://localhost:3000/api/doctor-questions", {
        method: "POST",
        body: "not json",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when parsed_result_id is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(buildRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("parsed_result_id");
  });

  it("returns 403 when user does not own the report", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // parsed_results
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "pr-1", report_id: "report-1", biomarkers: [] },
                error: null,
              }),
            }),
          }),
        };
      }
      // reports — owned by different user
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "report-1", user_id: "other-user" },
              error: null,
            }),
          }),
        }),
      };
    });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(
      buildRequest({ parsed_result_id: "pr-1" })
    );

    expect(response.status).toBe(403);
  });

  it("returns cached questions when they already exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const cachedQuestions = [
      {
        id: "q1",
        question: "What does my cholesterol level mean?",
        category: "clarifying",
        priority: "high",
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // parsed_results
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "pr-1", report_id: "report-1", biomarkers: [] },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // reports
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-1", user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      // doctor_questions — cached
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: cachedQuestions,
            error: null,
          }),
        }),
      };
    });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(
      buildRequest({ parsed_result_id: "pr-1" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cached).toBe(true);
    expect(body.questions).toHaveLength(1);
    expect(body.disclaimer).toContain("suggestions to help guide");
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("calls Claude and returns questions with max 10 limit", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // Generate 12 questions to test the limit
    const generatedQuestions = Array.from({ length: 12 }, (_, i) => ({
      question: `Question ${i + 1}?`,
      category: "clarifying" as const,
      priority: "medium" as const,
    }));

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // parsed_results
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "pr-1",
                  report_id: "report-1",
                  biomarkers: [
                    {
                      name: "Glucose",
                      value: 85,
                      unit: "mg/dL",
                      reference_low: 70,
                      reference_high: 100,
                      flag: "green",
                    },
                  ],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        // reports
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-1", user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 3) {
        // doctor_questions — empty (no cache)
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      if (callCount === 4) {
        // risk_flags
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      }
      // doctor_questions insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            questions: generatedQuestions,
            disclaimer: "These are suggestions.",
          }),
        },
      ],
    });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(
      buildRequest({ parsed_result_id: "pr-1" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cached).toBe(false);
    // Should be capped at 10 even though Claude returned 12
    expect(body.questions.length).toBeLessThanOrEqual(10);
    expect(body.disclaimer).toContain("suggestions to help guide");
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
  });

  it("validates question categories and priorities", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const mixedQuestions = [
      { question: "Valid question?", category: "clarifying", priority: "high" },
      { question: "Invalid cat", category: "invalid_cat", priority: "high" },
      { question: "Invalid pri", category: "clarifying", priority: "invalid" },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "pr-1",
                  report_id: "report-1",
                  biomarkers: [
                    { name: "Glucose", value: 85, unit: "mg/dL", reference_low: 70, reference_high: 100, flag: "green" },
                  ],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "report-1", user_id: "user-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (callCount === 3) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (callCount === 4) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ questions: mixedQuestions, disclaimer: "Test." }),
        },
      ],
    });

    const { POST } = await import("@/app/api/doctor-questions/route");
    const response = await POST(
      buildRequest({ parsed_result_id: "pr-1" })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    // Only the valid question should be included
    expect(body.questions).toHaveLength(1);
    expect(body.questions[0].question).toBe("Valid question?");
  });
});
