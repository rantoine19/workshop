-- Appointments table for tracking medical/dental appointments
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL,
  title text NOT NULL,
  provider_name text,
  provider_location text,
  appointment_type text NOT NULL DEFAULT 'doctor',
  date_time timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  notes text,
  reminder_1day boolean NOT NULL DEFAULT true,
  reminder_1hour boolean NOT NULL DEFAULT true,
  recurring text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_date ON appointments(date_time);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own appointments"
  ON appointments FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
