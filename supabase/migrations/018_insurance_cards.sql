-- Migration: Insurance cards storage
-- Ticket: #167 — Insurance card storage with photo upload and details
--
-- Creates the insurance_cards table for storing insurance provider details and
-- photo references. Photos themselves live in the `insurance-photos` private
-- storage bucket (see 019_insurance_photos_bucket.sql).
--
-- Insurance data is sensitive PII/PHI — RLS is enforced so users can only
-- access their own cards. Photos use per-user folder scoping in storage.

CREATE TABLE insurance_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  provider_name text NOT NULL,
  plan_type text,
  member_id text,
  group_number text,
  rx_bin text,
  rx_pcn text,
  rx_group text,
  policy_holder_name text,
  effective_date date,
  customer_service_phone text,
  notes text,
  front_photo_path text,
  back_photo_path text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_insurance_cards_user_id ON insurance_cards(user_id);
CREATE INDEX idx_insurance_cards_family_member_id ON insurance_cards(family_member_id);

ALTER TABLE insurance_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own insurance cards"
  ON insurance_cards FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
