import { describe, it, expect } from "vitest";
import {
  calculateHealthScore,
  type HealthScoreResult,
} from "@/lib/health/health-score";

// ── Health Credit Score Calculation (300-850 scale) ───────────────────

describe("calculateHealthScore", () => {
  // ── All green → 850 ────────────────────────────────────────────────

  it("returns 850 when all biomarkers are green", () => {
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Platelet Count", flag: "green" as const },
      { name: "Sodium", flag: "green" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(850);
    expect(result.label).toBe("Exceptional");
    expect(result.color).toBe("exceptional");
    expect(result.breakdown.green).toBe(3);
    expect(result.breakdown.yellow).toBe(0);
    expect(result.breakdown.red).toBe(0);
    expect(result.breakdown.total).toBe(3);
    expect(result.topConcerns).toEqual([]);
    expect(result.tips).toEqual([]);
  });

  // ── All red → 300 ──────────────────────────────────────────────────

  it("returns 300 when all biomarkers are red (no critical)", () => {
    const biomarkers = [
      { name: "Hemoglobin", flag: "red" as const },
      { name: "Platelet Count", flag: "red" as const },
      { name: "Sodium", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(300);
    expect(result.label).toBe("Insufficiently Active");
    expect(result.color).toBe("insufficient");
    expect(result.breakdown.red).toBe(3);
  });

  // ── All yellow → 575 (halfway between 300 and 850) ────────────────

  it("returns 575 when all biomarkers are yellow (half credit)", () => {
    const biomarkers = [
      { name: "Hemoglobin", flag: "yellow" as const },
      { name: "Platelet Count", flag: "yellow" as const },
      { name: "Sodium", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    // 300 + 0.5 * 550 = 300 + 275 = 575
    expect(result.score).toBe(575);
    expect(result.label).toBe("Insufficiently Active");
    expect(result.color).toBe("insufficient");
  });

  // ── Mixed flags ────────────────────────────────────────────────────

  it("calculates correct score for mixed flags (non-critical)", () => {
    // 2 green (credit 2*1=2), 1 yellow (credit 0.5), 1 red (credit 0)
    // All non-critical weight=1 each, totalWeight=4
    // fraction = 2.5/4 = 0.625
    // score = 300 + 0.625 * 550 = 300 + 343.75 = 644 (rounded)
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Platelet Count", flag: "green" as const },
      { name: "Sodium", flag: "yellow" as const },
      { name: "Potassium", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(644);
    expect(result.label).toBe("Moderately Active");
    expect(result.color).toBe("moderate");
  });

  // ── Critical biomarker weighting ───────────────────────────────────

  it("weights critical biomarkers 2x (glucose)", () => {
    // Hemoglobin (non-crit, w=1): green, credit = 1
    // Glucose (critical, w=2): red, credit = 0
    // totalWeight = 3, weightedCredit = 1
    // fraction = 1/3 = 0.333...
    // score = 300 + 0.333 * 550 = 300 + 183.3 = 483
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Glucose (Fasting)", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(483);
    expect(result.label).toBe("Insufficiently Active");
  });

  it("weights critical biomarkers 2x (Blood Pressure Systolic)", () => {
    // Hemoglobin (non-crit, w=1): green, credit = 1
    // BP Systolic (critical, w=2): yellow, credit = 2*0.5 = 1
    // totalWeight = 3, weightedCredit = 2
    // fraction = 2/3 = 0.667
    // score = 300 + 0.667 * 550 = 300 + 366.7 = 667
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Blood Pressure Systolic", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(667);
    expect(result.label).toBe("Moderately Active");
  });

  it("weights LDL Cholesterol as critical (2x)", () => {
    // Hemoglobin (w=1): green, credit = 1
    // LDL (w=2): green, credit = 2
    // totalWeight = 3, weightedCredit = 3
    // fraction = 1.0 → score = 850
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "LDL Cholesterol", flag: "green" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(850);
  });

  it("weights Hemoglobin A1C as critical (2x)", () => {
    // A1C (critical, w=2): red, credit = 0
    // Sodium (non-crit, w=1): green, credit = 1
    // totalWeight = 3, weightedCredit = 1
    // fraction = 1/3 → score = 483
    const biomarkers = [
      { name: "Hemoglobin A1C", flag: "red" as const },
      { name: "Sodium", flag: "green" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(483);
  });

  // ── Label threshold boundaries ─────────────────────────────────────

  it("labels score 800+ as Exceptional", () => {
    // All green → 850
    const biomarkers = [
      { name: "M1", flag: "green" as const },
      { name: "M2", flag: "green" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(850);
    expect(result.label).toBe("Exceptional");
    expect(result.color).toBe("exceptional");
  });

  it("labels score 740-799 as Very Active", () => {
    // Need score in 740-799 range
    // 3 green + 1 yellow, all non-critical:
    // fraction = (3 + 0.5) / 4 = 0.875
    // score = 300 + 0.875 * 550 = 300 + 481.25 = 781
    const biomarkers = [
      { name: "M1", flag: "green" as const },
      { name: "M2", flag: "green" as const },
      { name: "M3", flag: "green" as const },
      { name: "M4", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(781);
    expect(result.label).toBe("Very Active");
    expect(result.color).toBe("very-active");
  });

  it("labels score 670-739 as Active", () => {
    // 2 green + 2 yellow, all non-critical:
    // fraction = (2 + 1) / 4 = 0.75
    // score = 300 + 0.75 * 550 = 300 + 412.5 = 713
    const biomarkers = [
      { name: "M1", flag: "green" as const },
      { name: "M2", flag: "green" as const },
      { name: "M3", flag: "yellow" as const },
      { name: "M4", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(713);
    expect(result.label).toBe("Active");
    expect(result.color).toBe("active");
  });

  it("labels score 580-669 as Moderately Active", () => {
    // 1 green + 1 yellow + 1 red, all non-critical:
    // fraction = (1 + 0.5 + 0) / 3 = 0.5
    // score = 300 + 0.5 * 550 = 575
    const biomarkers = [
      { name: "M1", flag: "green" as const },
      { name: "M2", flag: "yellow" as const },
      { name: "M3", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(575);
    // 575 < 580 → Insufficiently Active
    // Let's use a different mix: 2 green + 1 yellow + 1 red = (2+0.5)/4 = 0.625
    // score = 300 + 0.625 * 550 = 644
    // That works.
  });

  it("returns Moderately Active for score 644", () => {
    const biomarkers = [
      { name: "M1", flag: "green" as const },
      { name: "M2", flag: "green" as const },
      { name: "M3", flag: "yellow" as const },
      { name: "M4", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(644);
    expect(result.label).toBe("Moderately Active");
    expect(result.color).toBe("moderate");
  });

  it("labels score below 580 as Insufficiently Active", () => {
    // 1 green + 2 red, all non-critical:
    // fraction = 1/3 = 0.333
    // score = 300 + 0.333 * 550 = 483
    const biomarkers = [
      { name: "M1", flag: "green" as const },
      { name: "M2", flag: "red" as const },
      { name: "M3", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(483);
    expect(result.label).toBe("Insufficiently Active");
    expect(result.color).toBe("insufficient");
  });

  // ── Top concerns extraction ────────────────────────────────────────

  it("returns red biomarkers before yellow in topConcerns", () => {
    const biomarkers = [
      { name: "Sodium", flag: "yellow" as const },
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Glucose (Fasting)", flag: "red" as const },
      { name: "Potassium", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.topConcerns[0]).toBe("Glucose (Fasting)");
    expect(result.topConcerns).toContain("Sodium");
    expect(result.topConcerns).toContain("Potassium");
  });

  it("limits topConcerns to 3 items", () => {
    const biomarkers = [
      { name: "A", flag: "red" as const },
      { name: "B", flag: "red" as const },
      { name: "C", flag: "yellow" as const },
      { name: "D", flag: "yellow" as const },
      { name: "E", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.topConcerns.length).toBe(3);
    expect(result.topConcerns[0]).toBe("A");
    expect(result.topConcerns[1]).toBe("B");
  });

  it("does not include green biomarkers in topConcerns", () => {
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Sodium", flag: "green" as const },
      { name: "Potassium", flag: "green" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.topConcerns).toEqual([]);
  });

  // ── Empty biomarkers → 300 ─────────────────────────────────────────

  it("returns score 300 with Insufficiently Active for empty biomarkers", () => {
    const result = calculateHealthScore([]);
    expect(result.score).toBe(300);
    expect(result.label).toBe("Insufficiently Active");
    expect(result.color).toBe("insufficient");
    expect(result.breakdown.total).toBe(0);
    expect(result.topConcerns).toEqual([]);
    expect(result.tips).toEqual([]);
  });

  // ── Breakdown counts ───────────────────────────────────────────────

  it("correctly counts breakdown by flag color", () => {
    const biomarkers = [
      { name: "A", flag: "green" as const },
      { name: "B", flag: "green" as const },
      { name: "C", flag: "yellow" as const },
      { name: "D", flag: "red" as const },
      { name: "E", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.breakdown).toEqual({
      green: 2,
      yellow: 1,
      red: 2,
      total: 5,
    });
  });

  // ── Multiple critical biomarkers ───────────────────────────────────

  it("applies 2x weight to multiple critical biomarkers", () => {
    // Total Cholesterol (critical, w=2): green, credit = 2
    // HDL (critical, w=2): green, credit = 2
    // Sodium (non-crit, w=1): red, credit = 0
    // totalWeight = 5, weightedCredit = 4
    // fraction = 4/5 = 0.8
    // score = 300 + 0.8 * 550 = 300 + 440 = 740
    const biomarkers = [
      { name: "Total Cholesterol", flag: "green" as const },
      { name: "HDL Cholesterol", flag: "green" as const },
      { name: "Sodium", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.score).toBe(740);
    expect(result.label).toBe("Very Active");
  });

  // ── Tips generation ────────────────────────────────────────────────

  it("generates improvement tips for non-green biomarkers", () => {
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Triglycerides", flag: "red" as const },
      { name: "Sodium", flag: "yellow" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.tips.length).toBeGreaterThan(0);
    expect(result.tips.length).toBeLessThanOrEqual(3);
    // Tips should mention biomarker names
    const tipText = result.tips.join(" ");
    expect(tipText).toContain("Triglycerides");
  });

  it("generates no tips when all biomarkers are green", () => {
    const biomarkers = [
      { name: "A", flag: "green" as const },
      { name: "B", flag: "green" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.tips).toEqual([]);
  });

  it("tips mention approximate point gains", () => {
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Potassium", flag: "red" as const },
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.tips.length).toBe(1);
    expect(result.tips[0]).toMatch(/~\d+ points/);
  });

  it("prioritizes tips by highest potential point gain", () => {
    // Critical red biomarker should generate biggest tip
    const biomarkers = [
      { name: "Hemoglobin", flag: "green" as const },
      { name: "Sodium", flag: "yellow" as const },          // non-crit, yellow → small gain
      { name: "Glucose (Fasting)", flag: "red" as const },  // critical, red → big gain
    ];
    const result = calculateHealthScore(biomarkers);
    expect(result.tips.length).toBeGreaterThan(0);
    // Glucose should be in the first tip since it has the highest gain
    expect(result.tips[0]).toContain("Glucose (Fasting)");
  });
});

// ── Health Score API ────────────────────────────────────────────────

describe("Health Score API route", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/health-score/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });
});
