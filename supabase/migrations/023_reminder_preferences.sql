-- Add reminder preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_frequency text DEFAULT 'daily';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminders_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_times text[] DEFAULT ARRAY['09:00', '18:00'];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reminder_shown timestamptz;
