/*
  # Fix RLS policies for coworking_header table
  
  1. Changes
    - Enable RLS on coworking_header table
    - Add policies for authenticated users if they don't exist
    
  2. Security
    - Allow authenticated users to insert and update records
*/

-- Enable RLS
ALTER TABLE coworking_header ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
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
END $$;