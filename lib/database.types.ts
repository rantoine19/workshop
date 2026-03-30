/**
 * Database types matching the Supabase schema defined in
 * supabase/migrations/001_initial_schema.sql
 */

// Enum types
export type ReportFileType = "pdf" | "image";
export type ReportStatus = "uploaded" | "parsing" | "parsed" | "error";
export type RiskFlagColor = "green" | "yellow" | "red";
export type RiskTrend = "improving" | "stable" | "worsening" | "unknown";
export type ChatRole = "user" | "assistant";
export type QuestionCategory =
  | "clarifying"
  | "follow_up"
  | "lifestyle"
  | "medication";
export type QuestionPriority = "high" | "medium" | "low";

// Biomarker structure stored in parsed_results.biomarkers JSONB
export interface Biomarker {
  name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: RiskFlagColor;
}

// Table row types
export interface Profile {
  id: string;
  display_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  updated_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  file_path: string;
  file_type: ReportFileType;
  original_filename: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface ParsedResult {
  id: string;
  report_id: string;
  raw_extraction: Record<string, unknown> | null;
  biomarkers: Biomarker[] | null;
  summary_plain: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskFlag {
  id: string;
  parsed_result_id: string;
  biomarker_name: string;
  value: number;
  reference_low: number | null;
  reference_high: number | null;
  flag: RiskFlagColor;
  trend: RiskTrend;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  report_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface DoctorQuestion {
  id: string;
  parsed_result_id: string;
  question: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  created_at: string;
}

// Insert types (omit auto-generated fields)
export type ProfileInsert = Omit<Profile, "updated_at">;
export type ReportInsert = Omit<Report, "id" | "status" | "created_at" | "updated_at">;
export type ParsedResultInsert = Omit<ParsedResult, "id" | "created_at" | "updated_at">;
export type RiskFlagInsert = Omit<RiskFlag, "id" | "created_at">;
export type ChatSessionInsert = Omit<ChatSession, "id" | "created_at" | "updated_at">;
export type ChatMessageInsert = Omit<ChatMessage, "id" | "created_at">;
export type DoctorQuestionInsert = Omit<DoctorQuestion, "id" | "created_at">;
