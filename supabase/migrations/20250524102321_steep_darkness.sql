/*
  # Add site settings table
  
  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key)
      - `navigation_items` (jsonb) - Stores navigation menu items and their order
      - `footer_settings` (jsonb) - Stores footer content and links
      - `about_page` (jsonb) - Stores about page content
      
  2. Security
    - Enable RLS
    - Public can view settings
    - Only authenticated users can update settings
*/

-- Create site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  navigation_items jsonb DEFAULT '[]',
  footer_settings jsonb DEFAULT '{}',
  about_page jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view site settings"
ON site_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can update site settings"
ON site_settings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO site_settings (
  navigation_items,
  footer_settings,
  about_page
) VALUES (
  '[
    {"id": "events", "label": "Мероприятия", "path": "/events", "visible": true},
    {"id": "speakers", "label": "Спикеры", "path": "/speakers", "visible": true},
    {"id": "rent", "label": "Аренда", "path": "/rent", "visible": true},
    {"id": "coworking", "label": "Коворкинг", "path": "/coworking", "visible": true},
    {"id": "about", "label": "О нас", "path": "/about", "visible": true}
  ]',
  '{
    "email": "info@sciencehub.site",
    "phone": "+7 (495) 123-45-67",
    "address": "Москва, ул. Научная, 15",
    "workingHours": "Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00",
    "socialLinks": {
      "telegram": "https://t.me/sciencehub",
      "vk": "https://vk.com/sciencehub",
      "youtube": "https://youtube.com/sciencehub"
    }
  }',
  '{
    "mission": {
      "title": "Наша миссия",
      "description": "ScienceHub создает экосистему для научного сообщества, объединяя исследователей, предпринимателей и инноваторов.",
      "stats": {
        "events": "150+",
        "scientists": "500+",
        "startups": "20+",
        "years": "5"
      }
    },
    "team": [
      {
        "id": 1,
        "name": "Алексей Иванов",
        "role": "Основатель",
        "bio": "Кандидат физико-математических наук, предприниматель в области deep tech",
        "image": "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg"
      }
    ],
    "partners": [
      {
        "id": 1,
        "name": "Российский научный фонд",
        "logo": "https://images.pexels.com/photos/4238603/pexels-photo-4238603.jpeg"
      }
    ]
  }'
);