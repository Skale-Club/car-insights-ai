-- Add Gemini API integration support

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
ALTER TABLE public.sessions ADD COLUMN gemini_analysis JSONB;

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
