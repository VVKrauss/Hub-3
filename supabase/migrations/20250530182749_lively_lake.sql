/*
  # Add RLS policies for coworking_info_table

  1. Security
    - Enable RLS on coworking_info_table
    - Add policies for authenticated users to:
      - INSERT new services
      - UPDATE existing services
      - DELETE services
    - Add policy for public users to view services
*/

-- Enable RLS
ALTER TABLE coworking_info_table ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert new services
CREATE POLICY "Authenticated users can insert coworking services"
ON coworking_info_table
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update services
CREATE POLICY "Authenticated users can update coworking services"
ON coworking_info_table
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete services
CREATE POLICY "Authenticated users can delete coworking services"
ON coworking_info_table
FOR DELETE
TO authenticated
USING (true);

-- Allow public users to view services
CREATE POLICY "Public can view coworking services"
ON coworking_info_table
FOR SELECT
TO public
USING (true);