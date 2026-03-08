-- Migration: Persist uploaded session CSV files in Supabase Storage
-- Created: 2026-02-19

-- Store storage path in sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS source_file_path TEXT;

-- Private bucket for uploaded session CSV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-csv',
  'session-csv',
  false,
  52428800,
  ARRAY['text/csv', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies scoped by first folder segment = auth.uid()
-- Some migration runners are not owner of storage.objects.
-- In that case, policy creation is skipped without failing the migration.
DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Users can upload own session CSV files" ON storage.objects';
    EXECUTE '
      CREATE POLICY "Users can upload own session CSV files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = ''session-csv''
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    ';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage INSERT policy creation (insufficient privilege).';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Users can read own session CSV files" ON storage.objects';
    EXECUTE '
      CREATE POLICY "Users can read own session CSV files"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = ''session-csv''
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    ';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage SELECT policy creation (insufficient privilege).';
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own session CSV files" ON storage.objects';
    EXECUTE '
      CREATE POLICY "Users can delete own session CSV files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = ''session-csv''
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    ';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage DELETE policy creation (insufficient privilege).';
  END;
END
$$;
