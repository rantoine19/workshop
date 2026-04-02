-- HealthChat AI: Storage Bucket for Medical Reports
-- Creates the "medical-reports" bucket and RLS policies for authenticated uploads.

-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================

-- Create the medical-reports bucket (private, not public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-reports',
  'medical-reports',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE RLS POLICIES
-- =============================================================================

-- Users can upload files to their own folder (userId/filename)
CREATE POLICY "Users can upload own medical reports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own uploaded files
CREATE POLICY "Users can read own medical reports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploaded files
CREATE POLICY "Users can delete own medical reports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medical-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
