-- Audit logging for PHI access (HIPAA requirement)
-- Tracks who accessed what resource and when.
-- Entries MUST NOT contain actual PHI data — only metadata.
-- No user-scoped RLS — admin-only access.

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE audit_action AS ENUM (
  'report.upload',
  'report.view',
  'report.parse',
  'chat.message',
  'doctor_questions.generate'
);

CREATE TYPE audit_resource_type AS ENUM (
  'report',
  'chat_session',
  'parsed_result'
);

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  resource_type audit_resource_type NOT NULL,
  resource_id uuid,
  ip_address inet,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Look up audit entries by user
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Look up audit entries by action type
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Look up audit entries by resource
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Time-range queries for compliance reporting
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- RLS: Write-only for authenticated users, read via service role only
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT audit entries for their own user_id.
-- This allows the anon-key Supabase client to write audit logs.
CREATE POLICY "Users can insert own audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No SELECT/UPDATE/DELETE policies — users cannot read or tamper with logs.
-- Only service_role (admin) can query audit logs for compliance reporting.
