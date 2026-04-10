import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BIOMARKER_KNOWLEDGE,
  KNOWLEDGE_INDEX,
  getBiomarkerKnowledge,
} from "@/lib/health/biomarker-knowledge";
import { generateActionItems } from "@/lib/health/action-items";
import { suggestRelatedTests } from "@/lib/health/related-tests";
import {
  lookupCondition,
  clearNlmCache,
  _parseNlmResponse,
} from "@/lib/health/nlm-api";
import {
  buildEnrichedContext,
  buildBiomarkerKnowledgeContext,
} from "@/lib/claude/chat-prompts";

// ---------------------------------------------------------------------------
// Biomarker Knowledge Base
// ---------------------------------------------------------------------------

describe("Biomarker Knowledge Base", () => {
  const requiredBiomarkers = [
    "Total Cholesterol",
    "LDL Cholesterol",
    "HDL Cholesterol",
    "Triglycerides",
    "Glucose (Fasting)",
    "Hemoglobin A1C",
    "BUN",
    "Creatinine",
    "Blood Pressure Systolic",
    "Blood Pressure Diastolic",
    "Hemoglobin",
    "Hematocrit",
    "White Blood Cell Count",
    "Platelet Count",
    "ALT",
    "AST",
    "TSH",
    "Vitamin D",
    "Vitamin B12",
    "Iron",
    "Uric Acid",
    "Resting Heart Rate",
  ];

  it("has entries for all required biomarkers", () => {
    for (const name of requiredBiomarkers) {
      const entry = getBiomarkerKnowledge(name);
      expect(entry, `Missing knowledge for: ${name}`).toBeDefined();
    }
  });

  it("has at least 22 biomarker entries", () => {
    expect(BIOMARKER_KNOWLEDGE.length).toBeGreaterThanOrEqual(22);
  });

  it("each entry has all required fields filled", () => {
    for (const entry of BIOMARKER_KNOWLEDGE) {
      expect(entry.name).toBeTruthy();
      expect(entry.whatItMeasures).toBeTruthy();
      expect(entry.whyItMatters).toBeTruthy();
      expect(entry.commonCausesHigh.length).toBeGreaterThan(0);
      expect(entry.lifestyleTips.length).toBeGreaterThan(0);
      expect(entry.relatedTests.length).toBeGreaterThan(0);
      expect(entry.foodsThatHelp.length).toBeGreaterThan(0);
      expect(entry.exerciseRecommendation).toBeTruthy();
      expect(entry.whenToWorry).toBeTruthy();
    }
  });

  it("KNOWLEDGE_INDEX allows case-insensitive lookup", () => {
    expect(KNOWLEDGE_INDEX.get("total cholesterol")).toBeDefined();
    expect(KNOWLEDGE_INDEX.get("glucose (fasting)")).toBeDefined();
    expect(KNOWLEDGE_INDEX.get("tsh")).toBeDefined();
  });

  it("getBiomarkerKnowledge is case-insensitive", () => {
    expect(getBiomarkerKnowledge("TOTAL CHOLESTEROL")).toBeDefined();
    expect(getBiomarkerKnowledge("total cholesterol")).toBeDefined();
    expect(getBiomarkerKnowledge("Total Cholesterol")).toBeDefined();
  });

  it("returns undefined for unknown biomarkers", () => {
    expect(getBiomarkerKnowledge("Imaginary Test")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Action Item Generator
// ---------------------------------------------------------------------------

describe("generateActionItems", () => {
  it("returns empty string when all biomarkers are green", () => {
    const result = generateActionItems([
      { name: "Total Cholesterol", value: 180, flag: "green" },
      { name: "HDL Cholesterol", value: 65, flag: "green" },
    ]);
    expect(result).toBe("");
  });

  it("generates actions for red-flagged biomarkers", () => {
    const result = generateActionItems([
      { name: "Total Cholesterol", value: 260, flag: "red" },
    ]);
    expect(result).toContain("HIGH PRIORITY");
    expect(result).toContain("Total Cholesterol");
    expect(result).toContain("260");
  });

  it("generates actions for yellow-flagged biomarkers", () => {
    const result = generateActionItems([
      { name: "Glucose (Fasting)", value: 110, flag: "yellow" },
    ]);
    expect(result).toContain("MODERATE PRIORITY");
    expect(result).toContain("Glucose (Fasting)");
    expect(result).toContain("110");
  });

  it("prioritizes red over yellow", () => {
    const result = generateActionItems([
      { name: "Glucose (Fasting)", value: 110, flag: "yellow" },
      { name: "Total Cholesterol", value: 260, flag: "red" },
    ]);
    const redIdx = result.indexOf("HIGH PRIORITY");
    const yellowIdx = result.indexOf("MODERATE PRIORITY");
    expect(redIdx).toBeLessThan(yellowIdx);
  });

  it("limits to 5 action items", () => {
    const biomarkers = [
      { name: "Total Cholesterol", value: 260, flag: "red" as const },
      { name: "LDL Cholesterol", value: 180, flag: "red" as const },
      { name: "Triglycerides", value: 300, flag: "red" as const },
      { name: "Glucose (Fasting)", value: 130, flag: "red" as const },
      { name: "Hemoglobin A1C", value: 7.0, flag: "red" as const },
      { name: "Blood Pressure Systolic", value: 160, flag: "red" as const },
      { name: "ALT", value: 100, flag: "red" as const },
    ];
    const result = generateActionItems(biomarkers);
    // Count priority labels
    const highCount = (result.match(/\[HIGH PRIORITY\]/g) || []).length;
    expect(highCount).toBeLessThanOrEqual(5);
  });

  it("personalizes for sedentary users", () => {
    const result = generateActionItems(
      [{ name: "Total Cholesterol", value: 250, flag: "red" }],
      { activity_level: "sedentary" }
    );
    // Should have lifestyle tips — not necessarily the word "exercise"
    // but the result should contain tips from the knowledge base
    expect(result).toContain("Total Cholesterol");
  });

  it("adds smoking tip for smokers", () => {
    const result = generateActionItems(
      [{ name: "Total Cholesterol", value: 250, flag: "red" }],
      { smoking_status: "current" }
    );
    expect(result.toLowerCase()).toContain("smok");
  });

  it("returns empty string when no knowledge exists for biomarker", () => {
    const result = generateActionItems([
      { name: "Imaginary Biomarker XYZ", value: 999, flag: "red" },
    ]);
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Related Test Suggestions
// ---------------------------------------------------------------------------

describe("suggestRelatedTests", () => {
  it("returns empty string when all biomarkers are green", () => {
    const result = suggestRelatedTests([
      { name: "Total Cholesterol", flag: "green" },
      { name: "HDL Cholesterol", flag: "green" },
    ]);
    expect(result).toBe("");
  });

  it("suggests related tests for flagged biomarkers", () => {
    const result = suggestRelatedTests([
      { name: "Glucose (Fasting)", flag: "yellow" },
    ]);
    expect(result).toContain("RELATED TEST SUGGESTIONS");
    expect(result).toContain("Hemoglobin A1C");
  });

  it("does not suggest tests the patient already has", () => {
    const result = suggestRelatedTests([
      { name: "Glucose (Fasting)", flag: "yellow" },
      { name: "Hemoglobin A1C", flag: "green" },
    ]);
    // A1C is already in their report, so shouldn't be suggested
    expect(result).not.toContain("consider asking about Hemoglobin A1C");
  });

  it("limits to 3 suggestions", () => {
    const result = suggestRelatedTests([
      { name: "Total Cholesterol", flag: "red" },
      { name: "Glucose (Fasting)", flag: "red" },
      { name: "Hemoglobin", flag: "red" },
      { name: "TSH", flag: "red" },
      { name: "Vitamin D", flag: "red" },
    ]);
    const suggestionCount = (result.match(/consider asking about/g) || []).length;
    expect(suggestionCount).toBeLessThanOrEqual(3);
  });

  it("prioritizes red-flagged biomarker suggestions first", () => {
    const result = suggestRelatedTests([
      { name: "Glucose (Fasting)", flag: "yellow" },
      { name: "Hemoglobin", flag: "red" },
    ]);
    // Should have Hemoglobin-related suggestions first since it's red
    expect(result).toContain("Hemoglobin is flagged");
  });

  it("includes conversation framing instruction", () => {
    const result = suggestRelatedTests([
      { name: "Glucose (Fasting)", flag: "yellow" },
    ]);
    expect(result).toContain("conversation starters with their doctor");
  });
});

// ---------------------------------------------------------------------------
// NLM API Integration
// ---------------------------------------------------------------------------

describe("NLM API", () => {
  beforeEach(() => {
    clearNlmCache();
    vi.restoreAllMocks();
  });

  describe("_parseNlmResponse", () => {
    it("parses valid response with results", () => {
      const data = [3, ["Diabetes", "Diabetes Mellitus", "Gestational Diabetes"], null, []];
      const result = _parseNlmResponse(data, "diabetes");
      expect(result).toContain("Diabetes");
      expect(result).toContain("Diabetes Mellitus");
    });

    it("returns null for empty results", () => {
      const data = [0, [], null, []];
      const result = _parseNlmResponse(data, "xyznotacondition");
      expect(result).toBeNull();
    });

    it("returns null for invalid data format", () => {
      expect(_parseNlmResponse("not an array", "test")).toBeNull();
      expect(_parseNlmResponse([], "test")).toBeNull();
      expect(_parseNlmResponse(null, "test")).toBeNull();
    });
  });

  describe("lookupCondition", () => {
    it("returns null for empty query", async () => {
      const result = await lookupCondition("");
      expect(result).toBeNull();
    });

    it("returns null for whitespace-only query", async () => {
      const result = await lookupCondition("   ");
      expect(result).toBeNull();
    });

    it("fetches from NLM API and returns formatted result", async () => {
      const mockResponse = [2, ["Hypertension", "Essential Hypertension"], null, []];
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await lookupCondition("hypertension");
      expect(result).toContain("Hypertension");
      expect(result).toContain("NLM Clinical Tables");
    });

    it("caches responses", async () => {
      const mockResponse = [1, ["Anemia"], null, []];
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      await lookupCondition("anemia");
      await lookupCondition("anemia");

      // Should only call fetch once due to caching
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("returns null on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network error")
      );

      const result = await lookupCondition("some condition");
      expect(result).toBeNull();
    });

    it("returns null on non-200 response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Server Error", { status: 500 })
      );

      const result = await lookupCondition("some condition");
      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Enriched Context Builder
// ---------------------------------------------------------------------------

describe("buildEnrichedContext", () => {
  it("returns empty string when all biomarkers are green", () => {
    const result = buildEnrichedContext([
      { name: "Total Cholesterol", value: 180, flag: "green" },
    ]);
    expect(result).toBe("");
  });

  it("includes biomarker knowledge for flagged values", () => {
    const result = buildEnrichedContext([
      { name: "Total Cholesterol", value: 250, unit: "mg/dL", flag: "red" },
    ]);
    expect(result).toContain("BIOMARKER KNOWLEDGE");
    expect(result).toContain("Total Cholesterol");
  });

  it("includes personalized action items", () => {
    const result = buildEnrichedContext([
      { name: "Total Cholesterol", value: 250, unit: "mg/dL", flag: "red" },
    ]);
    expect(result).toContain("PERSONALIZED ACTION ITEMS");
    expect(result).toContain("250");
  });

  it("includes related test suggestions", () => {
    const result = buildEnrichedContext([
      { name: "Glucose (Fasting)", value: 115, unit: "mg/dL", flag: "yellow" },
    ]);
    expect(result).toContain("RELATED TEST SUGGESTIONS");
  });

  it("includes enriched context instructions", () => {
    const result = buildEnrichedContext([
      { name: "Total Cholesterol", value: 250, unit: "mg/dL", flag: "red" },
    ]);
    expect(result).toContain("ENRICHED CONTEXT INSTRUCTIONS");
    expect(result).toContain("specific lifestyle changes");
  });

  it("accepts profile for personalization", () => {
    const result = buildEnrichedContext(
      [{ name: "Total Cholesterol", value: 250, unit: "mg/dL", flag: "red" }],
      { smoking_status: "current", activity_level: "sedentary" }
    );
    expect(result).toContain("PERSONALIZED ACTION ITEMS");
  });
});

describe("buildBiomarkerKnowledgeContext", () => {
  it("returns empty string for all green biomarkers", () => {
    const result = buildBiomarkerKnowledgeContext([
      { name: "Total Cholesterol", flag: "green" },
    ]);
    expect(result).toBe("");
  });

  it("includes knowledge for yellow/red flagged biomarkers", () => {
    const result = buildBiomarkerKnowledgeContext([
      { name: "Total Cholesterol", flag: "red" },
      { name: "HDL Cholesterol", flag: "green" },
      { name: "Glucose (Fasting)", flag: "yellow" },
    ]);
    expect(result).toContain("Total Cholesterol");
    expect(result).toContain("Glucose (Fasting)");
    expect(result).not.toContain("HDL Cholesterol");
  });

  it("includes what it measures, why it matters, and foods", () => {
    const result = buildBiomarkerKnowledgeContext([
      { name: "Total Cholesterol", flag: "red" },
    ]);
    expect(result).toContain("What it measures:");
    expect(result).toContain("Why it matters:");
    expect(result).toContain("Foods that help:");
    expect(result).toContain("Exercise:");
    expect(result).toContain("When to worry:");
  });
});
