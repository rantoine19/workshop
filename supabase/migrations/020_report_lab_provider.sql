-- #134: Format fingerprinting — store detected lab provider and confidence
ALTER TABLE reports ADD COLUMN IF NOT EXISTS lab_provider text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS lab_format_confidence numeric DEFAULT 0;
