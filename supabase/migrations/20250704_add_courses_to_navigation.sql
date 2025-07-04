/*
  # Add courses to navigation
  
  1. Updates
    - Update navigation_items to include courses menu item
    - Update default navigation order with courses
    
  2. Purpose
    - Add courses page to the main navigation
    - Maintain backward compatibility
*/

-- Обновляем навигацию, добавляя курсы между событиями и спикерами
UPDATE site_settings 
SET navigation_items = jsonb_build_array(
  jsonb_build_object('id', 'home', 'label', 'Главная', 'path', '/', 'visible', true, 'order', 0),
  jsonb_build_object('id', 'events', 'label', 'События', 'path', '/events', 'visible', true, 'order', 1),
  jsonb_build_object('id', 'courses', 'label', 'Курсы', 'path', '/courses', 'visible', true, 'order', 2),
  jsonb_build_object('id', 'speakers', 'label', 'Спикеры', 'path', '/speakers', 'visible', true, 'order', 3),
  jsonb_build_object('id', 'coworking', 'label', 'Коворкинг', 'path', '/coworking', 'visible', true, 'order', 4),
  jsonb_build_object('id', 'rent', 'label', 'Аренда', 'path', '/rent', 'visible', true, 'order', 5),
  jsonb_build_object('id', 'about', 'label', 'О нас', 'path', '/about', 'visible', true, 'order', 6)
)
WHERE navigation_items IS NOT NULL;

-- Если в таблице нет записей, создаем новую с курсами
INSERT INTO site_settings (navigation_items, footer_settings, about_page)
SELECT 
  jsonb_build_array(
    jsonb_build_object('id', 'home', 'label', 'Главная', 'path', '/', 'visible', true, 'order', 0),
    jsonb_build_object('id', 'events', 'label', 'События', 'path', '/events', 'visible', true, 'order', 1),
    jsonb_build_object('id', 'courses', 'label', 'Курсы', 'path', '/courses', 'visible', true, 'order', 2),
    jsonb_build_object('id', 'speakers', 'label', 'Спикеры', 'path', '/speakers', 'visible', true, 'order', 3),
    jsonb_build_object('id', 'coworking', 'label', 'Коворкинг', 'path', '/coworking', 'visible', true, 'order', 4),
    jsonb_build_object('id', 'rent', 'label', 'Аренда', 'path', '/rent', 'visible', true, 'order', 5),
    jsonb_build_object('id', 'about', 'label', 'О нас', 'path', '/about', 'visible', true, 'order', 6)
  ),
  jsonb_build_object(
    'email', 'info@sciencehub.site',
    'phone', '+381 123 456 789',
    'address', 'Science Hub, Панчево, Сербия',
    'workingHours', 'Пн-Пт: 9:00-22:00, Сб-Вс: 10:00-20:00',
    'socialLinks', jsonb_build_object(
      'telegram', 'https://t.me/sciencehub',
      'instagram', 'https://instagram.com/sciencehub',
      'youtube', 'https://youtube.com/sciencehub'
    )
  ),
  jsonb_build_object(
    'title', 'О Science Hub',
    'projectInfo', 'Science Hub - это место для научного сообщества в Сербии',
    'teamMembers', jsonb_build_array(),
    'contributors', jsonb_build_array(),
    'supportPlatforms', jsonb_build_array(),
    'contactInfo', jsonb_build_object()
  )
WHERE NOT EXISTS (SELECT 1 FROM site_settings LIMIT 1);

-- Комментарий
COMMENT ON COLUMN site_settings.navigation_items IS 'JSON массив элементов навигации с курсами'; 