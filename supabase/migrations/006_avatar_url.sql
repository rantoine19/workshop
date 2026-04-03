-- HealthChat AI: Add avatar_url column to profiles table
-- Stores the public URL for user profile pictures.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
