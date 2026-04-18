import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  anonymizeExtraction,
  type RawBiomarker,
} from "@/lib/health/anonymize-extraction";
import {
  meetsQualityThreshold,
} from "@/lib/health/example-library";
import {
  PARSE_REPORT_SYSTEM_PROMPT,
  buildParsePrompt,
} from "@/lib/claude/prompts";

// ── Anonymization ─────────────────────────────────────────────────────

describe("Anonymize extraction (#135)", () => {
  const sampleBiomarkers: RawBiomarker[] = [
    {
      name: "Total Cholesterol",
      value: 237,
      unit: "mg/dL",
      reference_low: null,
      reference_high: 200,
      flag: "red",
      confidence: 0.95,
    },
    {
      name: "LDL Cholesterol",
      value: 162,
      unit: "mg/dL",
      reference_low: null,
      reference_high: 100,
      flag: "red",
      confidence: 0.9,
    },
    {
      name: "HDL Cholesterol",
      value: 52,
      unit: "mg/dL",
      reference_low: 40,
      reference_high: 60,
      flag: "green",
      confidence: 0.92,
    },
    {
      name: "Glucose (Fasting)",
      value: 98,
      unit: "mg/dL",
      reference_low: 70,
      reference_high: 100,
      flag: "green",
      confidence: 0.88,
    },
  ];

  it("replaces actual values with placeholder values", () => {
    const result = anonymizeExtraction(sampleBiomarkers);

    // Original Total Cholesterol was 237, but placeholder should differ
    const totalChol = result.biomarkers.find(
      (b) => b.name === "Total Cholesterol"
    );
    expect(totalChol).toBeDefined();
    expect(totalChol!.value).not.toBe(237);
    // Should be 75% of reference_high (200) = 150
    expect(totalChol!.value).toBe(150);
  });

  it("preserves biomarker names exactly", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    const names = result.biomarkers.map((b) => b.name);
    expect(names).toEqual([
      "Total Cholesterol",
      "LDL Cholesterol",
      "HDL Cholesterol",
      "Glucose (Fasting)",
    ]);
  });

  it("preserves units exactly", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    for (const b of result.biomarkers) {
      expect(b.unit).toBe("mg/dL");
    }
  });

  it("preserves reference ranges", () => {
    const result = anonymizeExtraction(sampleBiomarkers);

    const hdl = result.biomarkers.find((b) => b.name === "HDL Cholesterol");
    expect(hdl!.reference_low).toBe(40);
    expect(hdl!.reference_high).toBe(60);

    const totalChol = result.biomarkers.find(
      (b) => b.name === "Total Cholesterol"
    );
    expect(totalChol!.reference_low).toBeNull();
    expect(totalChol!.reference_high).toBe(200);
  });

  it("preserves biomarker count and order", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    expect(result.biomarkers).toHaveLength(4);
    expect(result.biomarkers[0].name).toBe("Total Cholesterol");
    expect(result.biomarkers[3].name).toBe("Glucose (Fasting)");
  });

  it("sets all flags to green (placeholder values are within range)", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    for (const b of result.biomarkers) {
      expect(b.flag).toBe("green");
    }
  });

  it("removes confidence scores", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    for (const b of result.biomarkers) {
      expect(b).not.toHaveProperty("confidence");
    }
  });

  it("generates placeholder using midpoint when both bounds exist", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    // HDL: low=40, high=60 => midpoint = 50
    const hdl = result.biomarkers.find((b) => b.name === "HDL Cholesterol");
    expect(hdl!.value).toBe(50);
  });

  it("generates placeholder using 75% of high bound when only high exists", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    // LDL: high=100, no low => 100 * 0.75 = 75
    const ldl = result.biomarkers.find((b) => b.name === "LDL Cholesterol");
    expect(ldl!.value).toBe(75);
  });

  it("generates placeholder using 125% of low bound when only low exists", () => {
    const biomarkers: RawBiomarker[] = [
      {
        name: "Test Marker",
        value: 55,
        unit: "U/L",
        reference_low: 10,
        reference_high: null,
        flag: "green",
      },
    ];
    const result = anonymizeExtraction(biomarkers);
    // low=10, no high => 10 * 1.25 = 12.5
    expect(result.biomarkers[0].value).toBe(12.5);
  });

  it("rounds values when no reference range exists", () => {
    const biomarkers: RawBiomarker[] = [
      {
        name: "Unknown Marker",
        value: 147.3,
        unit: "units",
        reference_low: null,
        reference_high: null,
        flag: "unknown",
      },
    ];
    const result = anonymizeExtraction(biomarkers);
    // >= 100 => round to nearest 10 => 150
    expect(result.biomarkers[0].value).toBe(150);
  });

  it("generates a descriptive summary without PHI", () => {
    const result = anonymizeExtraction(sampleBiomarkers);
    expect(result.summary).toContain("lipid panel");
    expect(result.summary).toContain("glucose/diabetes markers");
    // Should NOT contain any patient-specific info
    expect(result.summary).not.toContain("237");
    expect(result.summary).not.toContain("162");
  });

  it("generates generic summary for unrecognized biomarkers", () => {
    const biomarkers: RawBiomarker[] = [
      {
        name: "Exotic Marker A",
        value: 5,
        unit: "pg/mL",
        reference_low: 2,
        reference_high: 8,
        flag: "green",
      },
      {
        name: "Exotic Marker B",
        value: 12,
        unit: "ng/dL",
        reference_low: null,
        reference_high: 20,
        flag: "green",
      },
      {
        name: "Exotic Marker C",
        value: 100,
        unit: "IU/mL",
        reference_low: 50,
        reference_high: 150,
        flag: "green",
      },
    ];
    const result = anonymizeExtraction(biomarkers);
    expect(result.summary).toContain("3 biomarker results");
  });

  it("handles empty biomarker array", () => {
    const result = anonymizeExtraction([]);
    expect(result.biomarkers).toHaveLength(0);
    expect(result.summary).toContain("0 biomarker results");
  });

  it("identifies CBC biomarkers in summary", () => {
    const cbcBiomarkers: RawBiomarker[] = [
      { name: "WBC", value: 7.5, unit: "K/uL", reference_low: 4.5, reference_high: 11.0, flag: "green" },
      { name: "RBC", value: 4.8, unit: "M/uL", reference_low: 4.2, reference_high: 5.9, flag: "green" },
      { name: "Hemoglobin", value: 14.5, unit: "g/dL", reference_low: 12.0, reference_high: 17.5, flag: "green" },
    ];
    const result = anonymizeExtraction(cbcBiomarkers);
    expect(result.summary).toContain("CBC");
  });

  it("identifies thyroid panel in summary", () => {
    const thyroidBiomarkers: RawBiomarker[] = [
      { name: "TSH", value: 2.5, unit: "mIU/L", reference_low: 0.4, reference_high: 4.0, flag: "green" },
      { name: "Free T4", value: 1.2, unit: "ng/dL", reference_low: 0.8, reference_high: 1.8, flag: "green" },
    ];
    const result = anonymizeExtraction(thyroidBiomarkers);
    expect(result.summary).toContain("thyroid panel");
  });
});

// ── Quality Threshold ─────────────────────────────────────────────────

describe("Quality threshold for storing examples (#135)", () => {
  it("accepts extraction with >= 3 biomarkers and good confidence", () => {
    const biomarkers: RawBiomarker[] = [
      { name: "A", value: 1, unit: "mg/dL", reference_low: 0, reference_high: 2, flag: "green", confidence: 0.9 },
      { name: "B", value: 2, unit: "mg/dL", reference_low: 0, reference_high: 3, flag: "green", confidence: 0.85 },
      { name: "C", value: 3, unit: "mg/dL", reference_low: 0, reference_high: 5, flag: "green", confidence: 0.8 },
    ];
    expect(meetsQualityThreshold(biomarkers)).toBe(true);
  });

  it("rejects extraction with < 3 biomarkers", () => {
    const biomarkers: RawBiomarker[] = [
      { name: "A", value: 1, unit: "mg/dL", reference_low: 0, reference_high: 2, flag: "green", confidence: 0.95 },
      { name: "B", value: 2, unit: "mg/dL", reference_low: 0, reference_high: 3, flag: "green", confidence: 0.9 },
    ];
    expect(meetsQualityThreshold(biomarkers)).toBe(false);
  });

  it("rejects extraction with low average confidence", () => {
    const biomarkers: RawBiomarker[] = [
      { name: "A", value: 1, unit: "mg/dL", reference_low: 0, reference_high: 2, flag: "green", confidence: 0.5 },
      { name: "B", value: 2, unit: "mg/dL", reference_low: 0, reference_high: 3, flag: "green", confidence: 0.4 },
      { name: "C", value: 3, unit: "mg/dL", reference_low: 0, reference_high: 5, flag: "green", confidence: 0.6 },
    ];
    // avg = 0.5 < 0.7
    expect(meetsQualityThreshold(biomarkers)).toBe(false);
  });

  it("accepts extraction at exactly the threshold (avg confidence = 0.7)", () => {
    const biomarkers: RawBiomarker[] = [
      { name: "A", value: 1, unit: "mg/dL", reference_low: 0, reference_high: 2, flag: "green", confidence: 0.7 },
      { name: "B", value: 2, unit: "mg/dL", reference_low: 0, reference_high: 3, flag: "green", confidence: 0.7 },
      { name: "C", value: 3, unit: "mg/dL", reference_low: 0, reference_high: 5, flag: "green", confidence: 0.7 },
    ];
    expect(meetsQualityThreshold(biomarkers)).toBe(true);
  });

  it("defaults missing confidence to 1.0", () => {
    const biomarkers: RawBiomarker[] = [
      { name: "A", value: 1, unit: "mg/dL", reference_low: 0, reference_high: 2, flag: "green" },
      { name: "B", value: 2, unit: "mg/dL", reference_low: 0, reference_high: 3, flag: "green" },
      { name: "C", value: 3, unit: "mg/dL", reference_low: 0, reference_high: 5, flag: "green" },
    ];
    expect(meetsQualityThreshold(biomarkers)).toBe(true);
  });

  it("rejects empty array", () => {
    expect(meetsQualityThreshold([])).toBe(false);
  });
});

// ── Build Parse Prompt ────────────────────────────────────────────────

describe("buildParsePrompt with few-shot examples (#135)", () => {
  it("returns base prompt when no hints or examples", () => {
    const prompt = buildParsePrompt();
    expect(prompt).toBe(PARSE_REPORT_SYSTEM_PROMPT);
  });

  it("includes FORMAT HINTS when provided", () => {
    const prompt = buildParsePrompt("Quest uses H/L flags.");
    expect(prompt).toContain("FORMAT HINTS:");
    expect(prompt).toContain("Quest uses H/L flags.");
  });

  it("includes few-shot examples when provided", () => {
    const examples = 'Here are examples of successfully extracted results:\n\nExample 1:\n{"biomarkers": []}';
    const prompt = buildParsePrompt(undefined, examples);
    expect(prompt).toContain("Here are examples of successfully extracted results:");
    expect(prompt).toContain("Example 1:");
  });

  it("includes both hints and examples when both provided", () => {
    const hints = "Quest uses H/L flags.";
    const examples = 'Here are examples of successfully extracted results:\n\nExample 1:\n{"biomarkers": []}';
    const prompt = buildParsePrompt(hints, examples);
    expect(prompt).toContain("FORMAT HINTS:");
    expect(prompt).toContain(hints);
    expect(prompt).toContain("Here are examples of successfully extracted results:");
  });

  it("hints appear before examples in the prompt", () => {
    const hints = "Quest uses H/L flags.";
    const examples = "Here are examples of successfully extracted results:";
    const prompt = buildParsePrompt(hints, examples);
    const hintsIndex = prompt.indexOf("FORMAT HINTS:");
    const examplesIndex = prompt.indexOf("Here are examples");
    expect(hintsIndex).toBeLessThan(examplesIndex);
  });

  it("empty example string is not appended", () => {
    const prompt = buildParsePrompt(undefined, "");
    expect(prompt).toBe(PARSE_REPORT_SYSTEM_PROMPT);
  });
});

// ── Example Library (findMatchingExamples) ────────────────────────────

describe("findMatchingExamples (#135)", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  function createMockSupabase(queryResults: Record<string, { data: unknown[] | null }> = {}) {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => {
        // Default: return empty result
        return Promise.resolve({ data: [], error: null });
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnThis(),
    };

    return {
      from: vi.fn().mockReturnValue(chainable),
      _chainable: chainable,
      _setQueryResult: (data: unknown[] | null) => {
        chainable.limit.mockResolvedValue({ data, error: null });
      },
      _setCountResult: (count: number) => {
        chainable.select.mockReturnValue({
          ...chainable,
          eq: vi.fn().mockReturnValue({
            ...chainable,
            is: vi.fn().mockResolvedValue({ count, error: null }),
            then: undefined,
          }),
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count, error: null }),
          }),
        });
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it("returns empty string when no examples found", async () => {
    const { findMatchingExamples } = await import("@/lib/health/example-library");
    mockSupabase._setQueryResult([]);

    const result = await findMatchingExamples(
      mockSupabase as unknown as Parameters<typeof findMatchingExamples>[0],
      "Quest Diagnostics",
      "pdf"
    );
    expect(result).toBe("");
  });

  it("returns formatted examples when provider matches", async () => {
    const { findMatchingExamples } = await import("@/lib/health/example-library");

    const exampleData = [
      {
        id: "ex1",
        lab_provider: "Quest Diagnostics",
        file_type: "pdf",
        biomarker_count: 5,
        anonymized_extraction: {
          biomarkers: [
            { name: "Total Cholesterol", value: 150, unit: "mg/dL", reference_low: null, reference_high: 200, flag: "green" },
          ],
          summary: "Lab report containing lipid panel results.",
        },
        quality_score: 0.9,
        usage_count: 3,
      },
    ];

    mockSupabase._setQueryResult(exampleData);

    const result = await findMatchingExamples(
      mockSupabase as unknown as Parameters<typeof findMatchingExamples>[0],
      "Quest Diagnostics",
      "pdf"
    );

    expect(result).toContain("Here are examples of successfully extracted results");
    expect(result).toContain("Example 1:");
    expect(result).toContain("Total Cholesterol");
    expect(result).toContain("Use these examples as a reference");
  });

  it("queries by lab_provider first", async () => {
    const { findMatchingExamples } = await import("@/lib/health/example-library");
    mockSupabase._setQueryResult([]);

    await findMatchingExamples(
      mockSupabase as unknown as Parameters<typeof findMatchingExamples>[0],
      "Quest Diagnostics",
      "pdf"
    );

    // First call should query extraction_examples
    expect(mockSupabase.from).toHaveBeenCalledWith("extraction_examples");
    // eq should be called with lab_provider
    expect(mockSupabase._chainable.eq).toHaveBeenCalledWith("lab_provider", "Quest Diagnostics");
  });

  it("falls back to file_type when no provider match", async () => {
    const { findMatchingExamples } = await import("@/lib/health/example-library");
    mockSupabase._setQueryResult([]);

    await findMatchingExamples(
      mockSupabase as unknown as Parameters<typeof findMatchingExamples>[0],
      null,
      "pdf"
    );

    // Should query by file_type since provider is null
    expect(mockSupabase._chainable.eq).toHaveBeenCalledWith("file_type", "pdf");
  });

  it("limits to max 2 examples", async () => {
    const { findMatchingExamples } = await import("@/lib/health/example-library");
    mockSupabase._setQueryResult([]);

    await findMatchingExamples(
      mockSupabase as unknown as Parameters<typeof findMatchingExamples>[0],
      "Quest Diagnostics",
      "pdf",
      5 // request 5, but should be capped at 2
    );

    expect(mockSupabase._chainable.limit).toHaveBeenCalledWith(2);
  });
});

// ── Parse Route Integration ───────────────────────────────────────────

describe("Parse route integrates few-shot examples (#135)", () => {
  it("parse route imports example library functions", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routeSource = fs.readFileSync(
      path.resolve("app/api/parse/route.ts"),
      "utf-8"
    );
    expect(routeSource).toContain("findMatchingExamples");
    expect(routeSource).toContain("storeExtractionExample");
    expect(routeSource).toContain("incrementExampleUsage");
  });

  it("parse route calls buildParsePrompt with examples", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routeSource = fs.readFileSync(
      path.resolve("app/api/parse/route.ts"),
      "utf-8"
    );
    expect(routeSource).toContain("buildParsePrompt(filenameDetection.hints, fewShotExamples");
  });

  it("parse route passes system prompt to parseReportWithClaude", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routeSource = fs.readFileSync(
      path.resolve("app/api/parse/route.ts"),
      "utf-8"
    );
    expect(routeSource).toContain("systemPrompt");
    expect(routeSource).toContain("parseReportWithClaude(");
  });

  it("parse route stores examples after successful parse", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routeSource = fs.readFileSync(
      path.resolve("app/api/parse/route.ts"),
      "utf-8"
    );
    expect(routeSource).toContain("storeExtractionExample(supabase");
  });
});

// ── Database Migration ────────────────────────────────────────────────

describe("Database migration (#135)", () => {
  it("creates extraction_examples table", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationSource = fs.readFileSync(
      path.resolve("supabase/migrations/022_extraction_examples.sql"),
      "utf-8"
    );
    expect(migrationSource).toContain("CREATE TABLE extraction_examples");
  });

  it("table has required columns", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationSource = fs.readFileSync(
      path.resolve("supabase/migrations/022_extraction_examples.sql"),
      "utf-8"
    );
    expect(migrationSource).toContain("id uuid PRIMARY KEY");
    expect(migrationSource).toContain("lab_provider text");
    expect(migrationSource).toContain("file_type text NOT NULL");
    expect(migrationSource).toContain("biomarker_count integer NOT NULL");
    expect(migrationSource).toContain("anonymized_extraction jsonb NOT NULL");
    expect(migrationSource).toContain("quality_score numeric NOT NULL");
    expect(migrationSource).toContain("verified boolean NOT NULL DEFAULT false");
    expect(migrationSource).toContain("usage_count integer NOT NULL DEFAULT 0");
  });

  it("has NO RLS (no user_id, shared anonymized data)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationSource = fs.readFileSync(
      path.resolve("supabase/migrations/022_extraction_examples.sql"),
      "utf-8"
    );
    expect(migrationSource).not.toContain("user_id");
    expect(migrationSource).not.toContain("ENABLE ROW LEVEL SECURITY");
    expect(migrationSource).not.toContain("CREATE POLICY");
  });

  it("has indexes for provider and quality score", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationSource = fs.readFileSync(
      path.resolve("supabase/migrations/022_extraction_examples.sql"),
      "utf-8"
    );
    expect(migrationSource).toContain("idx_extraction_examples_provider");
    expect(migrationSource).toContain("idx_extraction_examples_quality");
  });
});
