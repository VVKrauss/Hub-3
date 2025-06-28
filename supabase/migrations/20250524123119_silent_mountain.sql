/*
  # Add about_section column to site_settings table

  1. Changes
    - Add `about_section` column to `site_settings` table with JSONB type
    - Set default value to empty JSON object
    - Make column nullable

  2. Purpose
    - Store about section content including title, description, and image
    - Support the AdminHomeHeader component's about section management
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'about_section'
  ) THEN
    ALTER TABLE site_settings 
    ADD COLUMN about_section JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;