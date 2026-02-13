-- Migration: Configure Google OAuth Provider
-- Created: 2026-02-09

-- Note: Google OAuth configuration is primarily done through the Supabase Dashboard
-- This migration creates a note about the required configuration

-- To enable Google OAuth:
-- 1. Go to Supabase Dashboard > Authentication > Providers > Google
-- 2. Enable the provider
-- 3. Add the Client ID: <YOUR_CLIENT_ID>
-- 4. Add the Client Secret: <YOUR_CLIENT_SECRET>
-- 5. Configure Authorized redirect URI: https://<your-project>.supabase.co/auth/v1/callback

-- Create a function to get the current user's provider info (optional, for debugging)
CREATE OR REPLACE FUNCTION public.get_user_auth_info()
RETURNS TABLE (
  provider text,
  email text,
  confirmed_at timestamp with time zone
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.raw_app_meta_data->>'provider' as provider,
    u.email,
    u.email_confirmed_at
  FROM auth.users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Enable the function for authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_auth_info() TO authenticated;

-- Create index on auth.users for faster lookups by email (optional optimization)
-- Note: This is on the auth schema which may require superuser privileges
-- CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
