/*
  # Update RLS policies for speakers table
  
  1. Changes
    - Enable RLS on speakers table
    - Add policies for public and authenticated access
    - Check for existing policies before creating
    
  2. Security
    - Public can view active speakers
    - Authenticated users can manage speakers
*/

-- Enable RLS on speakers table if not already enabled
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public can view active speakers" ON speakers;
    DROP POLICY IF EXISTS "Authenticated users can view all speakers" ON speakers;
    DROP POLICY IF EXISTS "Authenticated users can create speakers" ON speakers;
    DROP POLICY IF EXISTS "Authenticated users can update speakers" ON speakers;
    DROP POLICY IF EXISTS "Authenticated users can delete speakers" ON speakers;
    
    -- Create new policies
    CREATE POLICY "Public can view active speakers"
    ON speakers
    FOR SELECT
    TO public
    USING (active = true);

    CREATE POLICY "Authenticated users can view all speakers"
    ON speakers
    FOR SELECT
    TO authenticated
    USING (true);

    CREATE POLICY "Authenticated users can create speakers"
    ON speakers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

    CREATE POLICY "Authenticated users can update speakers"
    ON speakers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Authenticated users can delete speakers"
    ON speakers
    FOR DELETE
    TO authenticated
    USING (true);
END
$$;