-- 🚨 RECREATE DATABASE SCHEMA 🚨
-- This script drops all existing tables and recreates them from scratch.

-- 1. DROP EXISTING TABLES
DROP TABLE IF EXISTS public.session_flags CASCADE;
DROP TABLE IF EXISTS public.session_rows CASCADE;
DROP TABLE IF EXISTS public.parameter_rules CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.car_profiles CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- 2. CREATE BASE SCHEMA (from 20260206193301_820f8520-db2f-4ded-a40a-5eab76b49b13.sql)

-- Car profiles
CREATE TABLE public.car_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '2010 Prius',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.car_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to car_profiles" ON public.car_profiles FOR ALL USING (true) WITH CHECK (true);

-- Sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_profile_id UUID REFERENCES public.car_profiles(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_filename TEXT NOT NULL,
  source_csv TEXT,
  source_file_path TEXT,
  session_start TIMESTAMP WITH TIME ZONE,
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  row_count INTEGER NOT NULL DEFAULT 0,
  columns JSONB,
  summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-- Session rows (sparse timeseries)
CREATE TABLE public.session_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  t_seconds DOUBLE PRECISION,
  t_timestamp TIMESTAMP WITH TIME ZONE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.session_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to session_rows" ON public.session_rows FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_session_rows_session_id ON public.session_rows(session_id);

-- Parameter rules
CREATE TABLE public.parameter_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_profile_id UUID REFERENCES public.car_profiles(id) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL,
  label TEXT NOT NULL,
  unit TEXT,
  canonical_key TEXT NOT NULL,
  normal_min DOUBLE PRECISION,
  normal_max DOUBLE PRECISION,
  warn_min DOUBLE PRECISION,
  warn_max DOUBLE PRECISION,
  critical_min DOUBLE PRECISION,
  critical_max DOUBLE PRECISION,
  min_duration_seconds INTEGER NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.parameter_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to parameter_rules" ON public.parameter_rules FOR ALL USING (true) WITH CHECK (true);

-- Session flags
CREATE TABLE public.session_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('normal', 'attention', 'critical')),
  canonical_key TEXT NOT NULL,
  parameter_key TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.session_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to session_flags" ON public.session_flags FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_session_flags_session_id ON public.session_flags(session_id);

-- Insert default car profile
INSERT INTO public.car_profiles (name, notes) VALUES ('2010 Prius', 'Toyota Prius Gen 3 - Default profile');

-- 3. APPLY GEMINI INTEGRATION (from 20260209_gemini_integration.sql)

-- App settings table for storing API keys and global configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  encrypted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Add Gemini analysis field to sessions table
-- Note: sessions table is already created above, so we just ALTER it.
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS gemini_analysis JSONB;

-- Create index for faster lookups
CREATE INDEX idx_app_settings_key ON public.app_settings(setting_key);

-- Add updated_at trigger for app_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_settings_updated_at 
  BEFORE UPDATE ON public.app_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Session CSV storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-csv',
  'session-csv',
  false,
  52428800,
  ARRAY['text/csv', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- 4. HELPER FUNCTIONS

-- Helper to run dynamic SQL (useful for future migrations via RPC)
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
