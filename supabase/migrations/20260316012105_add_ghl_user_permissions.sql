-- Add GHL user permission fields to usuarios table
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ghl_user_id TEXT,
  ADD COLUMN IF NOT EXISTS only_assigned_data BOOLEAN DEFAULT FALSE;
