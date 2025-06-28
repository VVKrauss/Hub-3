/*
  # Add info_section to site_settings table
  
  1. Changes
    - Add info_section column to site_settings table
    - Set default value with initial content
    
  2. Purpose
    - Store homepage info section content
    - Support content management through admin panel
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_settings' 
    AND column_name = 'info_section'
  ) THEN
    ALTER TABLE site_settings 
    ADD COLUMN info_section JSONB DEFAULT json_build_object(
      'enabled', true,
      'title', 'Добро пожаловать в ScienceHub',
      'description', 'Мы создаем уникальное пространство для науки, образования и инноваций. Присоединяйтесь к нашему сообществу исследователей, предпринимателей и энтузиастов.',
      'image', 'https://wummwcsqsznyyaajcxww.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png',
      'order', 1
    );
  END IF;
END $$;