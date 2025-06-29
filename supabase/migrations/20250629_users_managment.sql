-- Миграция 1: Обновление таблицы profiles для расширенного управления пользователями
/*
  # Enhanced User Management
  
  1. Расширяем таблицу profiles
    - Добавляем поля для email, last_sign_in_at, email_confirmed_at, banned_until
    - Добавляем поля для аватара и дополнительной информации
    
  2. Создаем таблицу user_registrations для связи пользователей с событиями
    
  3. Обновляем политики безопасности
*/

-- Добавляем недостающие поля в таблицу profiles 
DO $$ 
BEGIN
  -- Добавляем email если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;

  -- Добавляем last_sign_in_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_sign_in_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_sign_in_at TIMESTAMPTZ;
  END IF;

  -- Добавляем email_confirmed_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email_confirmed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_confirmed_at TIMESTAMPTZ;
  END IF;

  -- Добавляем banned_until если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'banned_until'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned_until TIMESTAMPTZ;
  END IF;

  -- Добавляем avatar если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar TEXT;
  END IF;

  -- Добавляем additional_info если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'additional_info'
  ) THEN
    ALTER TABLE profiles ADD COLUMN additional_info JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Создаем таблицу для регистраций пользователей на события
CREATE TABLE IF NOT EXISTS user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  qr_code TEXT,
  additional_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Уникальная регистрация пользователя на событие
  UNIQUE(user_id, event_id)
);

-- Включаем RLS для user_registrations
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;

-- Политики для user_registrations
CREATE POLICY "Admins can view all registrations"
ON user_registrations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  )
);

CREATE POLICY "Users can view own registrations"
ON user_registrations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert registrations"
ON user_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  )
);

CREATE POLICY "Users can insert own registrations"
ON user_registrations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all registrations"
ON user_registrations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  )
);

CREATE POLICY "Users can update own registrations"
ON user_registrations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at в user_registrations
DROP TRIGGER IF EXISTS update_user_registrations_updated_at ON user_registrations;
CREATE TRIGGER update_user_registrations_updated_at
BEFORE UPDATE ON user_registrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Функция для синхронизации данных пользователя с auth.users
CREATE OR REPLACE FUNCTION sync_user_auth_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем email и другие данные из auth.users
  UPDATE profiles SET
    email = NEW.email,
    last_sign_in_at = NEW.last_sign_in_at,
    email_confirmed_at = NEW.email_confirmed_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для синхронизации данных при обновлении auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_user_auth_data();

-- Обновляем функцию создания нового пользователя
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, email_confirmed_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'Guest',
    NEW.email_confirmed_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_banned_until ON profiles(banned_until);
CREATE INDEX IF NOT EXISTS idx_user_registrations_user_id ON user_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_registrations_event_id ON user_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON user_registrations(status);

-- Функция для получения статистики пользователей (доступна только админам)
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Проверяем права доступа
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'admins', (SELECT COUNT(*) FROM profiles WHERE role = 'Admin'),
    'editors', (SELECT COUNT(*) FROM profiles WHERE role = 'Editor'),
    'guests', (SELECT COUNT(*) FROM profiles WHERE role = 'Guest'),
    'active_users', (
      SELECT COUNT(*) FROM profiles 
      WHERE email_confirmed_at IS NOT NULL 
      AND (banned_until IS NULL OR banned_until <= now())
    ),
    'banned_users', (
      SELECT COUNT(*) FROM profiles 
      WHERE banned_until IS NOT NULL AND banned_until > now()
    ),
    'unconfirmed_users', (
      SELECT COUNT(*) FROM profiles 
      WHERE email_confirmed_at IS NULL
    ),
    'registrations_today', (
      SELECT COUNT(*) FROM user_registrations 
      WHERE registration_date >= CURRENT_DATE
    ),
    'active_registrations', (
      SELECT COUNT(*) FROM user_registrations 
      WHERE status = 'active'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC функция для обновления роли пользователя (только для админов)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем права доступа
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Проверяем валидность роли
  IF new_role NOT IN ('Admin', 'Editor', 'Guest') THEN
    RAISE EXCEPTION 'Invalid role. Must be Admin, Editor, or Guest.';
  END IF;
  
  -- Обновляем роль
  UPDATE profiles 
  SET role = new_role 
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC функция для блокировки пользователя
CREATE OR REPLACE FUNCTION ban_user(
  target_user_id UUID,
  ban_duration_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем права доступа
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Нельзя заблокировать себя
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself.';
  END IF;
  
  -- Обновляем banned_until
  UPDATE profiles 
  SET banned_until = now() + interval '1 day' * ban_duration_days
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC функция для разблокировки пользователя
CREATE OR REPLACE FUNCTION unban_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем права доступа
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Убираем блокировку
  UPDATE profiles 
  SET banned_until = NULL
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;