-- Expanded health profile: conditions, medications, lifestyle, family history
-- All fields optional — never force medical disclosure

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS known_conditions text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medications text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoking_status text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_history text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sleep_hours text;
