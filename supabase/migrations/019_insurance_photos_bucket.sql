-- Migration: Private storage bucket for insurance card photos
-- Ticket: #167 — Insurance card storage with photo upload and details
--
-- Insurance card photos are sensitive — stored in a PRIVATE bucket with
-- per-user folder scoping enforced by RLS. Path format:
--   insurance-photos/{userId}/{cardId}-{side}.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('insurance-photos', 'insurance-photos', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own insurance photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'insurance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own insurance photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'insurance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own insurance photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'insurance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own insurance photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'insurance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
