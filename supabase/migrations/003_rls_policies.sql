-- HealthChat AI: Row Level Security Policies
-- Enforces tenant isolation — users can only access their own data.
-- Uses auth.uid() to scope all operations to the authenticated user.

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_questions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PROFILES — user owns their own profile (id = auth.uid())
-- =============================================================================

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (id = auth.uid());

-- =============================================================================
-- REPORTS — user_id = auth.uid()
-- =============================================================================

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reports"
  ON reports FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reports"
  ON reports FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- PARSED RESULTS — accessible only if user owns the parent report
-- =============================================================================

CREATE POLICY "Users can view parsed results for their own reports"
  ON parsed_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = parsed_results.report_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert parsed results for their own reports"
  ON parsed_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = parsed_results.report_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update parsed results for their own reports"
  ON parsed_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = parsed_results.report_id
        AND reports.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = parsed_results.report_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete parsed results for their own reports"
  ON parsed_results FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reports
      WHERE reports.id = parsed_results.report_id
        AND reports.user_id = auth.uid()
    )
  );

-- =============================================================================
-- RISK FLAGS — accessible only if user owns the parent report (via parsed_results)
-- =============================================================================

CREATE POLICY "Users can view risk flags for their own reports"
  ON risk_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parsed_results
      JOIN reports ON reports.id = parsed_results.report_id
      WHERE parsed_results.id = risk_flags.parsed_result_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert risk flags for their own reports"
  ON risk_flags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parsed_results
      JOIN reports ON reports.id = parsed_results.report_id
      WHERE parsed_results.id = risk_flags.parsed_result_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete risk flags for their own reports"
  ON risk_flags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM parsed_results
      JOIN reports ON reports.id = parsed_results.report_id
      WHERE parsed_results.id = risk_flags.parsed_result_id
        AND reports.user_id = auth.uid()
    )
  );

-- =============================================================================
-- CHAT SESSIONS — user_id = auth.uid()
-- =============================================================================

CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- CHAT MESSAGES — accessible only if user owns the parent chat session
-- =============================================================================

CREATE POLICY "Users can view messages in their own chat sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their own chat sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their own chat sessions"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

-- =============================================================================
-- DOCTOR QUESTIONS — accessible only if user owns the parent report (via parsed_results)
-- =============================================================================

CREATE POLICY "Users can view doctor questions for their own reports"
  ON doctor_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parsed_results
      JOIN reports ON reports.id = parsed_results.report_id
      WHERE parsed_results.id = doctor_questions.parsed_result_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert doctor questions for their own reports"
  ON doctor_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parsed_results
      JOIN reports ON reports.id = parsed_results.report_id
      WHERE parsed_results.id = doctor_questions.parsed_result_id
        AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete doctor questions for their own reports"
  ON doctor_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM parsed_results
      JOIN reports ON reports.id = parsed_results.report_id
      WHERE parsed_results.id = doctor_questions.parsed_result_id
        AND reports.user_id = auth.uid()
    )
  );
