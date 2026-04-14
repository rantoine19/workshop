-- Migration: Family Members
-- Implements #141 — Family member profiles under one account
--
-- Creates family_members table for managing multiple people per account,
-- and adds family_member_id to reports so reports can be scoped per person.

-- =============================================================================
-- FAMILY MEMBERS TABLE
-- =============================================================================

CREATE TABLE family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  relationship text,
  date_of_birth date,
  gender text,
  height_inches integer,
  known_conditions text[] DEFAULT '{}',
  medications text,
  smoking_status text,
  family_history text[] DEFAULT '{}',
  activity_level text,
  sleep_hours text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_family_members_owner_id ON family_members(owner_id);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own family members"
  ON family_members FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- =============================================================================
-- ADD family_member_id TO REPORTS
-- =============================================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL;

CREATE INDEX idx_reports_family_member_id ON reports(family_member_id);
