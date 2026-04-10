-- Add report_date column to reports table
-- Stores the actual date the lab test was performed / report was issued,
-- extracted from the document content during parsing.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_date date;
