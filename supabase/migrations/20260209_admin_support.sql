-- Migration: Add admin user support
-- Created: 2026-02-09

-- Add is_admin column to car_profiles or create a separate admin table
-- Option 1: Add to car_profiles (simpler)
ALTER TABLE public.car_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_car_profiles_is_admin ON public.car_profiles(is_admin) WHERE is_admin = true;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_check BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_check
  FROM public.car_profiles
  WHERE user_id = user_uuid
  LIMIT 1;
  
  RETURN COALESCE(admin_check, false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Create function to get current user admin status
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.is_admin(auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- Create admin policy for car_profiles (admins can see all cars)
CREATE POLICY "Admins can view all car profiles" 
  ON public.car_profiles FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- Create admin policy for sessions (admins can see all sessions)
CREATE POLICY "Admins can view all sessions" 
  ON public.sessions FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- Note: To create the admin user, you should either:
-- 1. Use the Supabase Dashboard > Authentication > Users > Add User
-- 2. Run a one-time script (see below)

-- Option 2: Create admin user via SQL (run this after user signs up)
-- First, the user needs to sign up via the app, then run:
/*
UPDATE public.car_profiles 
SET is_admin = true 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'vanildinho@gmail.com' LIMIT 1
);
*/
