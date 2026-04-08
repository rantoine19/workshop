-- Add height_inches column to profiles table for onboarding wizard
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_inches integer;
