-- Migration: extraction_examples table for few-shot example library (#135)
-- Stores anonymized extraction templates used as few-shot prompt examples.
-- No per-user column, no RLS — examples are anonymized and shared globally.
-- They contain structure only (biomarker names, units, layout), never PHI.

CREATE TABLE extraction_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_provider text,
  file_type text NOT NULL,
  biomarker_count integer NOT NULL,
  anonymized_extraction jsonb NOT NULL,
  quality_score numeric NOT NULL DEFAULT 0.8,
  verified boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_extraction_examples_provider ON extraction_examples(lab_provider);
CREATE INDEX idx_extraction_examples_quality ON extraction_examples(quality_score DESC);
