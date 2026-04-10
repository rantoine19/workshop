-- Add confidence column to risk_flags for extraction quality scoring (#133)
ALTER TABLE risk_flags ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 1.0;
