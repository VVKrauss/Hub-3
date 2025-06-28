/*
  # Create About Table and Policies
  
  1. New Tables
    - `about_table`
      - `id` (integer, primary key)
      - `project_info` (text)
      - `team_members` (jsonb)
      - `contributors` (jsonb)
      - `support_platforms` (jsonb)
      - `contact_info` (jsonb)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
      
  2. Security
    - Enable RLS
    - Public can view
    - Only authenticated users can edit
*/

-- Create about table
CREATE TABLE IF NOT EXISTS about_table (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_info text NOT NULL,
  team_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  contributors jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE about_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view about data"
ON about_table
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can update about data"
ON about_table
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert about data"
ON about_table
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert default data if table is empty
INSERT INTO about_table (
  project_info,
  team_members,
  contributors,
  support_platforms,
  contact_info
) SELECT
  '<p><br></p>
  <p><strong>Science Hub </strong>— русскоязычный научно-популярный проект в Сербии. Мы делаем науку увлекательной, доступной и интересной — для всех, кто хочет понимать мир и меняться вместе с ним. Мы создаём пространство, где можно учиться, обсуждать, вдохновляться и встречать людей, которые так же, как и вы, любят задавать вопросы. Мы запустили Science Hub, чтобы построить в Сербии сообщество людей, которым интересна наука и важно быть в диалоге с современным знанием. В Science hub знания обретают голос, а наука и технологии становятся ближе.</p>',
  '[
    {
      "name": "Анастасия Сваровская",
      "role": "Соосновательница проекта",
      "photo": "https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images/about/team/1745932340134-photo_2025-04-12_11-30-03.jpg"
    },
    {
      "name": "Виталий Краусс",
      "role": "Сооснователь проекта",
      "photo": "https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images/about/team/1745931883214-photo_2024-10-07_21-42-31.jpg"
    }
  ]'::jsonb,
  '[
    {
      "name": "Настя",
      "photo": "https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images/about/contributor/1744499024125-image.jpg"
    },
    {
      "name": "Настя",
      "photo": "https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images/about/contributor/1744499032945-image%20(1).jpg"
    },
    {
      "name": "Катя",
      "photo": "https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images/about/contributor/1745352442223-photo_2025-04-18_15-48-17.jpg"
    },
    {
      "name": "Василиса",
      "photo": "https://owxdujzvjfchlqeadhev.supabase.co/storage/v1/object/public/images/about/contributor/1745392142740-vasilisa.jpg"
    }
  ]'::jsonb,
  '[
    { "url": "https://www.patreon.com/c/ScienceHub", "platform": "Patreon" },
    { "url": "https://boosty.to/sciencehub", "platform": "Boosty" },
    { "url": "https://www.paypal.com/paypalme/sciencehubrs", "platform": "PayPal" }
  ]'::jsonb,
  '{
    "email": "sciencehubrs@gmail.com",
    "phone": "+381 629434798",
    "address": "Sarajevska 48, Belgrade"
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM about_table);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_about_updated_at
  BEFORE UPDATE
  ON about_table
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();