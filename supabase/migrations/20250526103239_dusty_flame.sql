/*
  # Create Footer Settings Table
  
  1. New Tables
    - `footer_settings`
      - `id` (integer, primary key)
      - `logo_url` (text)
      - `columns` (integer)
      - `social_media` (jsonb)
      - `support_links` (jsonb)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `footer_text` (text)
      - `text_align` (text)
      
  2. Security
    - Enable RLS
    - Public can view
    - Only authenticated users can edit
*/

-- Create footer settings table
CREATE TABLE IF NOT EXISTS footer_settings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  logo_url text,
  columns integer,
  social_media jsonb,
  support_links jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  footer_text text,
  text_align text
);

-- Enable RLS
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view footer settings"
ON footer_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can update footer settings"
ON footer_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_footer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_footer_settings_updated_at
  BEFORE UPDATE
  ON footer_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_footer_settings_updated_at();

-- Insert initial data
INSERT INTO footer_settings (
  logo_url,
  columns,
  social_media,
  support_links,
  is_active,
  created_at,
  updated_at,
  footer_text,
  text_align
) VALUES (
  'https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images_bucket/logos/logo%20science_hub_white_no_title.png',
  4,
  '{"youtube": "https://www.youtube.com/@science_hub_rs", "telegram": "https://t.me/science_hub_rs", "instagram": "https://www.instagram.com/science_hub_rs"}',
  '{"boosty": "https://boosty.to/sciencehub", "paypal": "https://www.paypal.com/paypalme/sciencehubrs", "patreon": "https://www.patreon.com/ScienceHub"}',
  true,
  '2025-05-01 16:10:43.252795+00',
  '2025-05-09 22:49:41.958159+00',
  'Рассказываем в Сербии о науке легко и интересно через кинопоказы, лекции, фестивали, квизы, экскурсии.     Помогаем понять, как устроен мир, и найти единомышленников.',
  'left'
);