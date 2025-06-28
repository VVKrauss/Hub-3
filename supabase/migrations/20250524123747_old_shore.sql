/*
  # Add header settings column

  1. Changes
    - Add header_settings column to site_settings table
    - Set default value to empty JSON object
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'header_settings'
  ) THEN
    ALTER TABLE site_settings 
    ADD COLUMN header_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;