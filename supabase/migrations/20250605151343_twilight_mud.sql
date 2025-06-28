/*
  # Add logo size to header settings
  
  1. Changes
    - Update header_settings JSONB to include logoSize in centered object
    - Set default value of 150 pixels
    
  2. Purpose
    - Support logo size customization in admin panel
    - Maintain consistent logo sizing across the site
*/

DO $$ 
BEGIN
  -- Update existing rows to include logoSize if it doesn't exist
  UPDATE site_settings
  SET header_settings = jsonb_set(
    COALESCE(header_settings, '{}'::jsonb),
    '{centered}',
    COALESCE(
      header_settings->'centered',
      jsonb_build_object(
        'title', 'ScienceHub',
        'subtitle', 'Место для научного сообщества',
        'logoLight', 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png',
        'logoDark', 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_white_science_hub%20no_title.png',
        'logoSize', 150
      )
    )
  )
  WHERE header_settings IS NULL OR header_settings->'centered'->'logoSize' IS NULL;
END $$;