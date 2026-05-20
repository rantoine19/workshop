-- Biomarker corrections table for extraction feedback loop (#136)
-- Stores original + corrected values for audit trail and future model training.

CREATE TABLE biomarker_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_flag_id uuid NOT NULL REFERENCES risk_flags(id) ON DELETE CASCADE,
  original_value numeric NOT NULL,
  corrected_value numeric NOT NULL,
  original_name text,
  corrected_name text,
  original_unit text,
  corrected_unit text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_corrections_user_id ON biomarker_corrections(user_id);
CREATE INDEX idx_corrections_risk_flag_id ON biomarker_corrections(risk_flag_id);

ALTER TABLE biomarker_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own corrections"
  ON biomarker_corrections FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
