-- Migration 025: Tip interactions
-- Tracks user actions on daily health tips for personalization and streaks.
-- Actions: viewed, helpful, not_helpful, completed, favorited, dismissed,
--          unfavorited, undismissed

CREATE TABLE IF NOT EXISTS tip_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tip_interactions_user_id
  ON tip_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tip_interactions_action
  ON tip_interactions(action);
CREATE INDEX IF NOT EXISTS idx_tip_interactions_user_action
  ON tip_interactions(user_id, action);
CREATE INDEX IF NOT EXISTS idx_tip_interactions_created_at
  ON tip_interactions(created_at DESC);

ALTER TABLE tip_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tip interactions"
  ON tip_interactions;

CREATE POLICY "Users can manage own tip interactions"
  ON tip_interactions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
