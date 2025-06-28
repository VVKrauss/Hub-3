/*
  # Add RLS policies for rent_info_settings table
  
  1. Changes
    - Enable RLS on rent_info_settings table
    - Add policies for public and authenticated access
    - Add default row if none exists
    
  2. Security
    - Public can view rent info settings
    - Authenticated users can manage rent info settings
*/

-- Enable RLS
ALTER TABLE rent_info_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view rent info settings"
ON rent_info_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert rent info settings"
ON rent_info_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rent info settings"
ON rent_info_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rent info settings"
ON rent_info_settings
FOR DELETE
TO authenticated
USING (true);

-- Insert default row if none exists
INSERT INTO rent_info_settings (
  title,
  description,
  photos,
  pricelist,
  contacts
) 
SELECT 
  'Аренда помещений',
  'Современные помещения для проведения мероприятий, конференций и встреч',
  ARRAY['https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg'],
  jsonb_build_object(
    'hourly', 2000,
    'daily', 15000,
    'currency', 'RSD'
  ),
  jsonb_build_object(
    'address', 'Белград, ул. Научная 15',
    'phone', '+381 11 123 45 67',
    'email', 'rent@sciencehub.rs'
  )
WHERE NOT EXISTS (SELECT 1 FROM rent_info_settings);