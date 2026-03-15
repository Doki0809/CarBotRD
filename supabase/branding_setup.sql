-- Create branding_subaccounts table
CREATE TABLE IF NOT EXISTS branding_subaccounts (
    location_id TEXT PRIMARY KEY,
    agency_id TEXT,
    app_installed BOOLEAN DEFAULT FALSE,
    brand_id TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    theme_name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_branding_location_id ON branding_subaccounts(location_id);

-- Enable RLS
ALTER TABLE branding_subaccounts ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access for the dynamic loader (needed by the GHL custom script)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'branding_subaccounts' AND policyname = 'Allow public read by location_id'
    ) THEN
        CREATE POLICY "Allow public read by location_id" 
        ON branding_subaccounts 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Policy: Authenticated users (admins) can update/insert
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'branding_subaccounts' AND policyname = 'Allow service role all access'
    ) THEN
        CREATE POLICY "Allow service role all access" 
        ON branding_subaccounts 
        FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
