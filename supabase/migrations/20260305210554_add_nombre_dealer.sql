-- Add the missing column to the usuarios table
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_dealer TEXT;
