-- Migration: Create private storage bucket for medication/prescription photos
-- Ticket: #152 — Medication tracker

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('medication-photos', 'medication-photos', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own medication photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medication-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own medication photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medication-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own medication photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medication-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
