-- Migration: Add fallback CSV storage directly in sessions table
-- Created: 2026-02-19

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS source_csv TEXT;
