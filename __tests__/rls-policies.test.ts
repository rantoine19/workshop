import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/003_rls_policies.sql"
);
const sql = readFileSync(migrationPath, "utf-8");

const TABLES = [
  "profiles",
  "reports",
  "parsed_results",
  "risk_flags",
  "chat_sessions",
  "chat_messages",
  "doctor_questions",
];

describe("RLS Policies Migration", () => {
  it("enables RLS on all 7 tables", () => {
    for (const table of TABLES) {
      expect(sql).toContain(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`
      );
    }
  });

  it("creates SELECT policies for all tables", () => {
    for (const table of TABLES) {
      expect(sql).toContain(`ON ${table} FOR SELECT`);
    }
  });

  it("creates INSERT policies for all tables", () => {
    for (const table of TABLES) {
      expect(sql).toContain(`ON ${table} FOR INSERT`);
    }
  });

  it("creates DELETE policies for all tables", () => {
    for (const table of TABLES) {
      expect(sql).toContain(`ON ${table} FOR DELETE`);
    }
  });

  it("uses auth.uid() in all policies — never trusts client user_id", () => {
    const authUidCount = (sql.match(/auth\.uid\(\)/g) || []).length;
    // At least one auth.uid() per table (7 tables, multiple policies each)
    expect(authUidCount).toBeGreaterThanOrEqual(14);
  });

  it("does NOT contain USING (true) — no overly permissive policies", () => {
    expect(sql).not.toContain("USING (true)");
  });

  it("joined tables verify ownership through parent tables", () => {
    // parsed_results checks via reports
    expect(sql).toContain("reports.id = parsed_results.report_id");
    expect(sql).toContain("reports.user_id = auth.uid()");

    // risk_flags checks via parsed_results -> reports
    expect(sql).toContain("parsed_results.id = risk_flags.parsed_result_id");

    // chat_messages checks via chat_sessions
    expect(sql).toContain("chat_sessions.id = chat_messages.session_id");
    expect(sql).toContain("chat_sessions.user_id = auth.uid()");

    // doctor_questions checks via parsed_results -> reports
    expect(sql).toContain(
      "parsed_results.id = doctor_questions.parsed_result_id"
    );
  });

  it("profiles table uses id = auth.uid() (not user_id)", () => {
    // profiles PK is id which references auth.users(id)
    const profileSection = sql.substring(
      sql.indexOf("PROFILES"),
      sql.indexOf("REPORTS")
    );
    expect(profileSection).toContain("id = auth.uid()");
    expect(profileSection).not.toContain("user_id");
  });
});
