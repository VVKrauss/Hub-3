/*
  # Create rent_info_settings table

  1. New Tables
    - `rent_info_settings`
      - `id` (integer, primary key, auto-increment)
      - `title` (text, not null)
      - `description` (text)
      - `photos` (jsonb array)
      - `amenities` (jsonb array)
      - `pricelist` (jsonb array)
      - `contacts` (jsonb object)
      - `main_prices` (jsonb object)
      - `included_services` (jsonb array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `rent_info_settings` table
    - Add policy for public read access
    - Add policy for authenticated users to insert/update
*/

CREATE TABLE IF NOT EXISTS rent_info_settings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title text NOT NULL DEFAULT 'Аренда пространства',
  description text DEFAULT '',
  photos jsonb DEFAULT '[]'::jsonb,
  amenities jsonb DEFAULT '[]'::jsonb,
  pricelist jsonb DEFAULT '[]'::jsonb,
  contacts jsonb DEFAULT '{}'::jsonb,
  main_prices jsonb DEFAULT '{}'::jsonb,
  included_services jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rent_info_settings ENABLE ROW LEVEL SECURITY;

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

-- Insert default data if table is empty
INSERT INTO rent_info_settings (
  title,
  description,
  photos,
  main_prices,
  included_services,
  contacts
) 
SELECT 
  'Аренда пространства ScienceHub',
  '<p>Современное пространство для проведения ваших мероприятий, встреч и презентаций. Мы предлагаем комфортную атмосферу и все необходимое оборудование для успешного проведения любых событий.</p>',
  '["https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg", "https://images.pexels.com/photos/1181248/pexels-photo-1181248.jpeg"]'::jsonb,
  '{"hourly": 25, "daily": 150}'::jsonb,
  '["Wi-Fi", "Проектор", "Звуковая система", "Кондиционер", "Кухонная зона", "Парковка"]'::jsonb,
  '{"address": "Адрес будет указан при бронировании", "phone": "+381 XX XXX XXXX", "email": "info@sciencehub.rs"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM rent_info_settings LIMIT 1);