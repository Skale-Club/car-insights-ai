-- Migration: Add is_admin column to car_profiles
-- Created: 2026-02-09

-- Add is_admin column
ALTER TABLE public.car_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add user_id column if not exists
ALTER TABLE public.car_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_car_profiles_is_admin ON public.car_profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_car_profiles_user_id ON public.car_profiles(user_id);

-- Add to sessions table if not exists
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- Add to app_settings table if not exists  
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON public.app_settings(user_id);

-- Update schema cache (forces Supabase to refresh)
COMMENT ON TABLE public.car_profiles IS 'Car profiles with admin support';

-- Verify columns were added
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'car_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
