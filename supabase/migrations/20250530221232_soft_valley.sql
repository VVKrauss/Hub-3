-- Enable RLS if not already enabled
ALTER TABLE coworking_header ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can insert coworking header" ON coworking_header;
DROP POLICY IF EXISTS "Authenticated users can update coworking header" ON coworking_header;

-- Create new policies
CREATE POLICY "Authenticated users can insert coworking header"
ON coworking_header
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update coworking header"
ON coworking_header
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);