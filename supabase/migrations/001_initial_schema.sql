-- HealthChat AI: Initial Database Schema
-- Creates all core tables, enum types, and indexes.
-- RLS policies are handled in a separate migration (002_rls_policies.sql).

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE report_file_type AS ENUM ('pdf', 'image');
CREATE TYPE report_status AS ENUM ('uploaded', 'parsing', 'parsed', 'error');
CREATE TYPE risk_flag_color AS ENUM ('green', 'yellow', 'red');
CREATE TYPE risk_trend AS ENUM ('improving', 'stable', 'worsening', 'unknown');
CREATE TYPE chat_role AS ENUM ('user', 'assistant');
CREATE TYPE question_category AS ENUM ('clarifying', 'follow_up', 'lifestyle', 'medication');
CREATE TYPE question_priority AS ENUM ('high', 'medium', 'low');

-- =============================================================================
-- TABLES
-- =============================================================================

-- Profiles: extends Supabase Auth users with app-specific data
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  date_of_birth date,
  gender text,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Reports: uploaded medical report files
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type report_file_type NOT NULL,
  original_filename text NOT NULL,
  status report_status NOT NULL DEFAULT 'uploaded',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Parsed Results: extracted data from medical reports
CREATE TABLE parsed_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  raw_extraction jsonb,
  biomarkers jsonb,
  summary_plain text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Risk Flags: Green/Yellow/Red indicators per biomarker
CREATE TABLE risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parsed_result_id uuid NOT NULL REFERENCES parsed_results(id) ON DELETE CASCADE,
  biomarker_name text NOT NULL,
  value numeric NOT NULL,
  reference_low numeric,
  reference_high numeric,
  flag risk_flag_color NOT NULL,
  trend risk_trend NOT NULL DEFAULT 'unknown',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Chat Sessions: conversation containers
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Chat Messages: individual messages within a session
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Doctor Questions: generated visit prep questions
CREATE TABLE doctor_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parsed_result_id uuid NOT NULL REFERENCES parsed_results(id) ON DELETE CASCADE,
  question text NOT NULL,
  category question_category NOT NULL,
  priority question_priority NOT NULL DEFAULT 'medium',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Reports: look up by user
CREATE INDEX idx_reports_user_id ON reports(user_id);

-- Parsed Results: look up by report
CREATE INDEX idx_parsed_results_report_id ON parsed_results(report_id);

-- Risk Flags: look up by parsed result
CREATE INDEX idx_risk_flags_parsed_result_id ON risk_flags(parsed_result_id);

-- Chat Sessions: look up by user and report
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_report_id ON chat_sessions(report_id);

-- Chat Messages: look up by session, ordered by time
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);

-- Doctor Questions: look up by parsed result
CREATE INDEX idx_doctor_questions_parsed_result_id ON doctor_questions(parsed_result_id);
