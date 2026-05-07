-- Migration 024: Notification preferences and notification log
-- Adds full per-type notification configuration with quiet hours and a log
-- of notifications sent for in-app display.

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled boolean NOT NULL DEFAULT true,

  daily_checkin_enabled boolean NOT NULL DEFAULT true,
  daily_checkin_frequency text NOT NULL DEFAULT 'daily',

  medication_reminders_enabled boolean NOT NULL DEFAULT true,
  medication_reminder_minutes_before integer NOT NULL DEFAULT 0,

  appointment_reminders_enabled boolean NOT NULL DEFAULT true,

  blood_work_reminders_enabled boolean NOT NULL DEFAULT true,
  blood_work_interval_months integer NOT NULL DEFAULT 6,

  goal_progress_enabled boolean NOT NULL DEFAULT true,
  goal_progress_frequency text NOT NULL DEFAULT 'weekly',

  daily_tip_enabled boolean NOT NULL DEFAULT false,

  quiet_hours_start text NOT NULL DEFAULT '21:00',
  quiet_hours_end text NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'America/New_York',

  push_subscription jsonb,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id
  ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification preferences"
  ON notification_preferences;

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notification log — tracks reminders/notifications sent for in-app history
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  title text NOT NULL,
  body text,
  url text,
  sent_at timestamptz DEFAULT now() NOT NULL,
  read boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id
  ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
  ON notification_log(sent_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notification_log;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notification_log;
DROP POLICY IF EXISTS "Users can update own notifications" ON notification_log;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notification_log;

CREATE POLICY "Users can read own notifications"
  ON notification_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
  ON notification_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notification_log FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notification_log FOR DELETE TO authenticated
  USING (user_id = auth.uid());
