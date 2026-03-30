-- Test migration: verify Supabase branch creation on PR
-- This migration adds a simple test table that can be safely removed.
-- DELETE THIS MIGRATION after verifying Supabase branching works.

CREATE TABLE _test_supabase_branch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL DEFAULT 'Supabase branching works!',
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE _test_supabase_branch IS 'Temporary table to verify Supabase PR branching. Safe to drop.';
