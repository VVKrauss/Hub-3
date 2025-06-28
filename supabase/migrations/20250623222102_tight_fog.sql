/*
  # Create profiles table and RLS policies
  
  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `role` (text) - 'Admin', 'Editor', or 'Guest'
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS
    - Public can view profiles
    - Users can update their own profiles
    - Admins can update any profile
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Guest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
    DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Authenticated users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Public can view own profile" ON profiles;
END $$;

-- Create policies
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles profiles_1
    WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'Admin'
  )
);

CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles profiles_1
    WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'Admin'
  )
);

CREATE POLICY "Authenticated users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Public can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'Guest'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();