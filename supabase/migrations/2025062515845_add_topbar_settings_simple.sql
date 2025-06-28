-- Безопасная миграция для добавления настроек топбара
-- Файл: supabase/migrations/[timestamp]_add_topbar_settings_safe.sql

-- Добавляем поле topbar_settings если его еще нет
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS topbar_settings jsonb;

-- Устанавливаем значения по умолчанию только если поле NULL
UPDATE site_settings 
SET topbar_settings = jsonb_build_object(
  'alignment', 'center',
  'style', 'classic',
  'spacing', 'normal',
  'showBorder', true,
  'showShadow', true,
  'backgroundColor', 'white',
  'animation', 'slide',
  'mobileCollapse', true,
  'showIcons', false,
  'showBadges', true,
  'stickyHeader', true,
  'maxWidth', 'container'
)
WHERE topbar_settings IS NULL;

-- Безопасно обновляем navigation_items, добавляя order только если его нет
UPDATE site_settings 
SET navigation_items = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(item) = 'object' AND item ? 'order' THEN item
      WHEN jsonb_typeof(item) = 'object' THEN item || jsonb_build_object('order', ordinality - 1)
      ELSE item
    END
  )
  FROM jsonb_array_elements(navigation_items) WITH ORDINALITY AS item(item, ordinality)
)
WHERE navigation_items IS NOT NULL 
  AND jsonb_typeof(navigation_items) = 'array'
  AND jsonb_array_length(navigation_items) > 0;

-- Включаем RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Allow public read access" ON site_settings;
DROP POLICY IF EXISTS "Allow authenticated update access" ON site_settings;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON site_settings;

-- Создаем новые политики
CREATE POLICY "Allow public read access" ON site_settings
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update access" ON site_settings
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated insert access" ON site_settings
FOR INSERT TO authenticated WITH CHECK (true);

-- Добавляем комментарий к новому полю
COMMENT ON COLUMN site_settings.topbar_settings IS 'JSON настройки внешнего вида и поведения топбара';

-- Создаем индекс для быстрого поиска настроек топбара
CREATE INDEX IF NOT EXISTS idx_site_settings_topbar ON site_settings USING gin (topbar_settings);