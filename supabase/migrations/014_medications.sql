-- Migration: Create medications table for structured medication tracking
-- Ticket: #152 — Medication tracker

CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text,
  dosage_unit text,
  frequency text NOT NULL DEFAULT 'daily',
  time_of_day text,
  prescribing_doctor text,
  start_date date,
  notes text,
  photo_path text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_medications_user_id ON medications(user_id);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own medications"
  ON medications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
