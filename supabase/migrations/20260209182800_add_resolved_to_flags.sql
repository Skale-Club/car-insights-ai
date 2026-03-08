
-- Add resolved column to session_flags
ALTER TABLE session_flags 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
