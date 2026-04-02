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

// ── Audit Logs RLS ──────────────────────────────────────────────────

describe("Audit Logs RLS Migration", () => {
  const auditMigrationPath = resolve(
    __dirname,
    "../supabase/migrations/004_audit_log.sql"
  );
  const auditSql = readFileSync(auditMigrationPath, "utf-8");

  it("enables RLS on audit_logs table", () => {
    expect(auditSql).toContain(
      "ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY"
    );
  });

  it("allows authenticated users to INSERT their own audit logs", () => {
    expect(auditSql).toContain("ON audit_logs");
    expect(auditSql).toContain("FOR INSERT");
    expect(auditSql).toContain("TO authenticated");
    expect(auditSql).toContain("auth.uid() = user_id");
  });

  it("does NOT allow SELECT for regular users — admin-only reads", () => {
    expect(auditSql).not.toContain("FOR SELECT");
  });

  it("does NOT allow UPDATE for regular users — audit logs are immutable", () => {
    expect(auditSql).not.toContain("FOR UPDATE");
  });

  it("does NOT allow DELETE for regular users — audit logs cannot be tampered", () => {
    expect(auditSql).not.toContain("FOR DELETE");
  });
});

// ── Storage Bucket Migration ──────────────────────────────────────────

describe("Storage Bucket Migration", () => {
  const storageMigrationPath = resolve(
    __dirname,
    "../supabase/migrations/005_storage_bucket.sql"
  );
  const storageSql = readFileSync(storageMigrationPath, "utf-8");

  it("creates the medical-reports bucket", () => {
    expect(storageSql).toContain("'medical-reports'");
    expect(storageSql).toContain("storage.buckets");
  });

  it("sets bucket as private (not public)", () => {
    expect(storageSql).toContain("false");
    expect(storageSql).not.toMatch(/public,\s*true/i);
  });

  it("enforces 10MB file size limit", () => {
    expect(storageSql).toContain("10485760");
  });

  it("allows only PDF, PNG, and JPEG mime types", () => {
    expect(storageSql).toContain("application/pdf");
    expect(storageSql).toContain("image/png");
    expect(storageSql).toContain("image/jpeg");
  });

  it("creates INSERT policy scoped to user folder", () => {
    expect(storageSql).toContain("FOR INSERT");
    expect(storageSql).toContain("auth.uid()::text");
    expect(storageSql).toContain("storage.foldername");
  });

  it("creates SELECT policy for users to read own files", () => {
    expect(storageSql).toContain("FOR SELECT");
    expect(storageSql).toContain("bucket_id = 'medical-reports'");
  });

  it("creates DELETE policy for users to remove own files", () => {
    expect(storageSql).toContain("FOR DELETE");
  });

  it("all policies require authenticated role", () => {
    const authCount = (storageSql.match(/TO authenticated/g) || []).length;
    expect(authCount).toBeGreaterThanOrEqual(3);
  });
});
