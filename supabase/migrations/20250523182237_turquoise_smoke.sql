/*
  # Configure RLS policies for speakers table
  
  1. Changes
    - Enable RLS on speakers table
    - Add policies for public and authenticated access
    
  2. Security
    - Public can view active speakers
    - Authenticated users can manage speakers
*/

-- Enable RLS on speakers table if not already enabled
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

-- Allow public to view active speakers
CREATE POLICY "Public can view active speakers"
ON speakers
FOR SELECT
TO public
USING (active = true);

-- Allow authenticated users to view all speakers
CREATE POLICY "Authenticated users can view all speakers"
ON speakers
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create speakers
CREATE POLICY "Authenticated users can create speakers"
ON speakers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update speakers
CREATE POLICY "Authenticated users can update speakers"
ON speakers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete speakers
CREATE POLICY "Authenticated users can delete speakers"
ON speakers
FOR DELETE
TO authenticated
USING (true);