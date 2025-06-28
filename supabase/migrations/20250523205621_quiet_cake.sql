/*
  # Create homepage settings table and policies
  
  1. Changes
    - Create homepage settings table if not exists
    - Enable RLS
    - Set up policies for public view and authenticated updates
    - Insert default settings
    
  2. Security
    - Public read access
    - Only authenticated users can update settings
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public can view homepage settings" ON homepage_settings;
    DROP POLICY IF EXISTS "Authenticated users can update homepage settings" ON homepage_settings;
END $$;

-- Create homepage settings table
CREATE TABLE IF NOT EXISTS homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  events_count integer DEFAULT 3,
  show_title boolean DEFAULT true,
  show_date boolean DEFAULT true,
  show_time boolean DEFAULT true,
  show_language boolean DEFAULT true,
  show_type boolean DEFAULT true,
  show_age boolean DEFAULT true,
  show_image boolean DEFAULT true,
  show_price boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view homepage settings"
ON homepage_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can update homepage settings"
ON homepage_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default settings if none exist
INSERT INTO homepage_settings (
  events_count,
  show_title,
  show_date,
  show_time,
  show_language,
  show_type,
  show_age,
  show_image,
  show_price
) SELECT 
  3, -- Default number of events
  true, -- Show title
  true, -- Show date
  true, -- Show time
  true, -- Show language
  true, -- Show type
  true, -- Show age
  true, -- Show image
  true  -- Show price
WHERE NOT EXISTS (SELECT 1 FROM homepage_settings);