import { describe, it, expect } from "vitest";

// ── Persona Module ─────────────────────────────────────────────────

describe("Persona Module", () => {
  it("exports all persona constants", async () => {
    const mod = await import("@/lib/claude/persona");
    expect(mod.PERSONA_NAME).toBeDefined();
    expect(mod.PERSONA_PREAMBLE).toBeDefined();
    expect(mod.CHAT_DISCLAIMER).toBeDefined();
    expect(mod.JSON_DISCLAIMER).toBeDefined();
    expect(mod.DOCTOR_QUESTIONS_DISCLAIMER).toBeDefined();
    expect(mod.CONVERSATIONAL_STYLE).toBeDefined();
    expect(mod.REASSURANCE_PATTERNS).toBeDefined();
  });

  it("persona name is 'HealthChat AI health guide'", async () => {
    const { PERSONA_NAME } = await import("@/lib/claude/persona");
    expect(PERSONA_NAME).toBe("HealthChat AI health guide");
  });

  it("preamble includes the persona name", async () => {
    const { PERSONA_PREAMBLE, PERSONA_NAME } = await import(
      "@/lib/claude/persona"
    );
    expect(PERSONA_PREAMBLE).toContain(PERSONA_NAME);
  });

  it("preamble enforces 5th grade reading level", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    expect(PERSONA_PREAMBLE).toContain("5th grade reading level");
  });

  it("preamble prohibits diagnoses and treatment recommendations", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    expect(PERSONA_PREAMBLE).toContain("NEVER diagnose");
    expect(PERSONA_PREAMBLE).toContain("NEVER provide medical advice");
  });

  it("preamble uses 'your results show' framing", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    expect(PERSONA_PREAMBLE).toContain("your results show");
  });

  it("preamble includes reassurance-first pattern", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    expect(PERSONA_PREAMBLE).toContain(
      "This is exactly the kind of thing your doctor can help with"
    );
  });

  it("preamble includes supportive nudge", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    expect(PERSONA_PREAMBLE).toContain(
      "You're doing great by looking into this"
    );
  });

  it("preamble includes stigma-reducing language", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    expect(PERSONA_PREAMBLE).toContain("Normalize curiosity");
  });

  it("conversational style enforces short responses", async () => {
    const { CONVERSATIONAL_STYLE } = await import("@/lib/claude/persona");
    expect(CONVERSATIONAL_STYLE).toContain("2-3 sentences max");
  });

  it("conversational style requires follow-up questions", async () => {
    const { CONVERSATIONAL_STYLE } = await import("@/lib/claude/persona");
    expect(CONVERSATIONAL_STYLE).toContain("follow-up question");
  });

  it("reassurance patterns is a non-empty array", async () => {
    const { REASSURANCE_PATTERNS } = await import("@/lib/claude/persona");
    expect(Array.isArray(REASSURANCE_PATTERNS)).toBe(true);
    expect(REASSURANCE_PATTERNS.length).toBeGreaterThan(0);
  });
});

// ── Persona Consistency Across Features ────────────────────────────

describe("Persona Consistency", () => {
  it("all three system prompts include the shared persona preamble", async () => {
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");
    const { CHAT_SYSTEM_PROMPT } = await import("@/lib/claude/chat-prompts");
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );

    // All three should start with the shared preamble
    expect(CHAT_SYSTEM_PROMPT).toContain(PERSONA_PREAMBLE);
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain(PERSONA_PREAMBLE);
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain(PERSONA_PREAMBLE);
  });

  it("all three system prompts enforce 5th grade reading level", async () => {
    const { CHAT_SYSTEM_PROMPT } = await import("@/lib/claude/chat-prompts");
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );

    expect(CHAT_SYSTEM_PROMPT).toContain("5th grade");
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain("5th grade");
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain("5th grade");
  });

  it("all three system prompts prohibit diagnoses", async () => {
    const { CHAT_SYSTEM_PROMPT } = await import("@/lib/claude/chat-prompts");
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );

    expect(CHAT_SYSTEM_PROMPT).toContain("NEVER diagnose");
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain("NEVER diagnose");
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain("NEVER diagnose");
  });

  it("parse-report prompt does NOT include the warm persona", async () => {
    const { PARSE_REPORT_SYSTEM_PROMPT } = await import(
      "@/lib/claude/prompts"
    );
    const { PERSONA_PREAMBLE } = await import("@/lib/claude/persona");

    expect(PARSE_REPORT_SYSTEM_PROMPT).not.toContain(PERSONA_PREAMBLE);
    expect(PARSE_REPORT_SYSTEM_PROMPT).not.toContain("HealthChat AI health guide");
  });

  it("all three features use the same persona name", async () => {
    const { PERSONA_NAME } = await import("@/lib/claude/persona");
    const { CHAT_SYSTEM_PROMPT } = await import("@/lib/claude/chat-prompts");
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );

    expect(CHAT_SYSTEM_PROMPT).toContain(PERSONA_NAME);
    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain(PERSONA_NAME);
    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain(PERSONA_NAME);
  });

  it("chat disclaimer is used in the chat prompt", async () => {
    const { CHAT_DISCLAIMER } = await import("@/lib/claude/persona");
    const { CHAT_SYSTEM_PROMPT } = await import("@/lib/claude/chat-prompts");

    expect(CHAT_SYSTEM_PROMPT).toContain(CHAT_DISCLAIMER);
  });

  it("JSON disclaimer is used in the simplification prompt", async () => {
    const { JSON_DISCLAIMER } = await import("@/lib/claude/persona");
    const { SIMPLIFICATION_SYSTEM_PROMPT } = await import(
      "@/lib/claude/simplification-prompts"
    );

    expect(SIMPLIFICATION_SYSTEM_PROMPT).toContain(JSON_DISCLAIMER);
  });

  it("doctor questions disclaimer is used in the doctor prompt", async () => {
    const { DOCTOR_QUESTIONS_DISCLAIMER } = await import(
      "@/lib/claude/persona"
    );
    const { DOCTOR_QUESTIONS_SYSTEM_PROMPT } = await import(
      "@/lib/claude/doctor-prompts"
    );

    expect(DOCTOR_QUESTIONS_SYSTEM_PROMPT).toContain(DOCTOR_QUESTIONS_DISCLAIMER);
  });
});
