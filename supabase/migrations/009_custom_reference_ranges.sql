-- Custom reference ranges per user (#50)
-- Allows users to set personalized biomarker thresholds that override defaults.

CREATE TABLE custom_reference_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker_name text NOT NULL,
  green_low numeric,
  green_high numeric,
  yellow_low numeric,
  yellow_high numeric,
  red_low numeric,
  red_high numeric,
  direction text NOT NULL DEFAULT 'range'
    CHECK (direction IN ('lower-is-better', 'higher-is-better', 'range')),
  source text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, biomarker_name)
);

ALTER TABLE custom_reference_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own custom ranges"
  ON custom_reference_ranges FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
