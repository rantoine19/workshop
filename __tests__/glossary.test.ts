import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GLOSSARY_ENTRIES,
  getGlossaryEntry,
  getDefinition,
  getEntriesByCategory,
  getCategories,
  searchGlossary,
  lookupTerm,
  clearGlossaryNlmCache,
} from "@/lib/health/glossary";

// ---------------------------------------------------------------------------
// Glossary database
// ---------------------------------------------------------------------------

describe("Glossary database", () => {
  it("has at least 100 terms", () => {
    expect(GLOSSARY_ENTRIES.length).toBeGreaterThanOrEqual(100);
  });

  it("every entry has required fields", () => {
    for (const entry of GLOSSARY_ENTRIES) {
      expect(entry.term).toBeTruthy();
      expect(entry.aliases.length).toBeGreaterThan(0);
      expect(entry.definition).toBeTruthy();
      expect(entry.category).toBeTruthy();
    }
  });

  it("has no duplicate terms", () => {
    const terms = GLOSSARY_ENTRIES.map((e) => e.term);
    const unique = new Set(terms);
    expect(unique.size).toBe(terms.length);
  });

  it("has entries in all expected categories", () => {
    const categories = getCategories();
    expect(categories).toContain("Lab Test");
    expect(categories).toContain("Condition");
    expect(categories).toContain("Measurement");
    expect(categories).toContain("Organ");
    expect(categories).toContain("General");
    expect(categories).toContain("Medication Term");
  });
});

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

describe("getGlossaryEntry", () => {
  it("finds a term by exact name (case-insensitive)", () => {
    const entry = getGlossaryEntry("Total Cholesterol");
    expect(entry).not.toBeNull();
    expect(entry?.term).toBe("Total Cholesterol");
  });

  it("finds a term by alias", () => {
    const entry = getGlossaryEntry("ldl");
    expect(entry).not.toBeNull();
    expect(entry?.term).toBe("LDL Cholesterol");
  });

  it("finds a term by alias case-insensitively", () => {
    const entry = getGlossaryEntry("HBA1C");
    expect(entry).not.toBeNull();
    expect(entry?.term).toBe("A1C");
  });

  it("returns null for unknown terms", () => {
    expect(getGlossaryEntry("xyzzy-unknown-term")).toBeNull();
  });
});

describe("getDefinition", () => {
  it("returns definition for known terms", () => {
    const def = getDefinition("A1C");
    expect(def).toContain("average blood sugar");
  });

  it("returns fallback for unknown terms", () => {
    const def = getDefinition("some-unknown");
    expect(def).toBe("A health marker measured in your lab work.");
  });
});

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

describe("getEntriesByCategory", () => {
  it("returns only entries in the given category", () => {
    const labTests = getEntriesByCategory("Lab Test");
    expect(labTests.length).toBeGreaterThan(0);
    for (const entry of labTests) {
      expect(entry.category).toBe("Lab Test");
    }
  });

  it("returns at least 30 lab tests", () => {
    const labTests = getEntriesByCategory("Lab Test");
    expect(labTests.length).toBeGreaterThanOrEqual(30);
  });

  it("returns at least 15 conditions", () => {
    const conditions = getEntriesByCategory("Condition");
    expect(conditions.length).toBeGreaterThanOrEqual(15);
  });

  it("returns at least 8 measurements", () => {
    const measurements = getEntriesByCategory("Measurement");
    expect(measurements.length).toBeGreaterThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe("searchGlossary", () => {
  it("returns empty array for empty query", () => {
    expect(searchGlossary("")).toEqual([]);
    expect(searchGlossary("   ")).toEqual([]);
  });

  it("finds entries by term name", () => {
    const results = searchGlossary("cholesterol");
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.some((r) => r.term === "Total Cholesterol")).toBe(true);
  });

  it("finds entries by alias", () => {
    const results = searchGlossary("hba1c");
    expect(results.some((r) => r.term === "A1C")).toBe(true);
  });

  it("finds entries by definition content", () => {
    const results = searchGlossary("butterfly");
    expect(results.some((r) => r.term === "Thyroid")).toBe(true);
  });

  it("is case-insensitive", () => {
    const lower = searchGlossary("ldl");
    const upper = searchGlossary("LDL");
    expect(lower.length).toBe(upper.length);
  });
});

// ---------------------------------------------------------------------------
// NLM fallback
// ---------------------------------------------------------------------------

describe("lookupTerm", () => {
  beforeEach(() => {
    clearGlossaryNlmCache();
  });

  it("returns local entry for known terms without calling NLM", async () => {
    const entry = await lookupTerm("A1C");
    expect(entry).not.toBeNull();
    expect(entry?.term).toBe("A1C");
  });

  it("falls back to NLM for unknown terms", async () => {
    // Mock fetch for NLM API
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([1, ["Fibromyalgia"], null, [["Fibromyalgia info"]]]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const entry = await lookupTerm("fibromyalgia");
    expect(entry).not.toBeNull();
    expect(entry?.category).toBe("Condition");

    vi.unstubAllGlobals();
  });

  it("returns null when NLM returns no results", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([0, [], null, []]),
    });
    vi.stubGlobal("fetch", mockFetch);

    const entry = await lookupTerm("xyzzy-nonexistent-condition");
    expect(entry).toBeNull();

    vi.unstubAllGlobals();
  });

  it("caches NLM results", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([1, ["Lupus"], null, [["Lupus info"]]]),
    });
    vi.stubGlobal("fetch", mockFetch);

    await lookupTerm("lupus");
    await lookupTerm("lupus");

    // fetch should only be called once due to caching
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
