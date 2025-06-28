/*
  # Add homepage settings table
  
  1. New Tables
    - `homepage_settings`
      - `id` (uuid, primary key)
      - `events_count` (integer)
      - `show_title` (boolean)
      - `show_date` (boolean)
      - `show_time` (boolean)
      - `show_language` (boolean)
      - `show_type` (boolean)
      - `show_age` (boolean)
      - `show_image` (boolean)
      - `show_price` (boolean)
      
  2. Security
    - Enable RLS on homepage_settings table
    - Add policies for authenticated users
*/

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

-- Insert default settings
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
) VALUES (
  3, -- Default number of events
  true, -- Show title
  true, -- Show date
  true, -- Show time
  true, -- Show language
  true, -- Show type
  true, -- Show age
  true, -- Show image
  true  -- Show price
);