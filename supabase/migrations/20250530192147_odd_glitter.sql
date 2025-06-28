-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'coworking_header'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE coworking_header ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can insert coworking header" ON coworking_header;
    DROP POLICY IF EXISTS "Authenticated users can update coworking header" ON coworking_header;
END $$;

-- Create insert policy
CREATE POLICY "Authenticated users can insert coworking header"
ON coworking_header
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create update policy
CREATE POLICY "Authenticated users can update coworking header"
ON coworking_header
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);