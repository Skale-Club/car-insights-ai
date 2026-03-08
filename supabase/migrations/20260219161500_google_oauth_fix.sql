-- Migration: Configure Google OAuth Provider - FIX for redirect_uri_mismatch
-- Created: 2026-02-09

-- IMPORTANT: To fix the "redirect_uri_mismatch" error, you must configure the 
-- Authorized redirect URIs in Google Cloud Console correctly.

-- ============================================================================
-- CONFIGURATION STEPS TO FIX redirect_uri_mismatch ERROR:
-- ============================================================================

-- Step 1: Get your Supabase Project URL
-- Go to: Supabase Dashboard > Project Settings > API
-- Find your "Project URL" (e.g., https://your-project-ref.supabase.co)

-- Step 2: Configure in Google Cloud Console
-- Go to: https://console.cloud.google.com/apis/credentials
-- Find your OAuth 2.0 Client ID and click Edit
-- Under "Authorized redirect URIs", add BOTH of these:

-- FOR PRODUCTION (Supabase hosted):
-- https://<your-project-ref>.supabase.co/auth/v1/callback

-- FOR LOCAL DEVELOPMENT:
-- http://localhost:5173/auth/v1/callback
-- http://localhost:5000/auth/v1/callback

-- Step 3: Configure in Supabase Dashboard
-- Go to: Supabase Dashboard > Authentication > Providers > Google
-- Enable Google provider
-- Client ID: <YOUR_CLIENT_ID>
-- Client Secret: <YOUR_CLIENT_SECRET>

-- Step 4: Save and wait 5-10 minutes for changes to propagate

-- ============================================================================
-- NOTE: The redirect_uri_mismatch error occurs when the redirect URI sent by
-- Supabase doesn't match any of the URIs authorized in Google Cloud Console.
-- Make sure to add EXACTLY these URIs (including http vs https):
-- ============================================================================

-- Create a function to help debug OAuth configuration
CREATE OR REPLACE FUNCTION public.get_site_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN current_setting('app.settings.site_url', true);
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_site_url() TO anon, authenticated;

-- Add helpful comment to auth schema
COMMENT ON SCHEMA auth IS 'Auth schema for Supabase Auth. For OAuth debugging, ensure redirect URIs match between Supabase config and Google Cloud Console.';
