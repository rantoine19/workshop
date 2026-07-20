-- Migration: Health Goals
-- Implements #150 — Health goals with 6 standard goals
--
-- Users can activate/deactivate a fixed set of standard goals (defined in
-- lib/health/standard-goals.ts). Progress is computed from the latest
-- biomarker readings on every parse and displayed on the dashboard and a
-- dedicated /goals page.

CREATE TABLE health_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  goal_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  activated_at timestamptz DEFAULT now() NOT NULL,
  achieved_at timestamptz,
  starting_value numeric,
  current_value numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, family_member_id, goal_id)
);

CREATE INDEX idx_health_goals_user_id ON health_goals(user_id);
CREATE INDEX idx_health_goals_status ON health_goals(status);

ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own health goals"
  ON health_goals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
