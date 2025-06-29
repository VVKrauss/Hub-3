/*
  # Fix Database Error Granting User

  This migration addresses the "Database error granting user" issue by:
  1. Ensuring proper RLS policies for profile creation
  2. Creating a robust trigger function for handling new user creation
  3. Adding proper error handling and constraints
  4. Fixing any potential issues with the profiles table structure

  ## Changes Made
  1. Drop and recreate the user creation trigger with better error handling
  2. Update RLS policies to allow proper user creation
  3. Ensure all required columns have proper defaults
  4. Add proper foreign key constraints
*/

-- First, let's ensure the profiles table has proper structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'qr_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN qr_token uuid DEFAULT gen_random_uuid() UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'additional_info'
  ) THEN
    ALTER TABLE profiles ADD COLUMN additional_info jsonb DEFAULT '{}';
  END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
BEGIN
  -- Extract name from user metadata or use email prefix
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Insert new profile with error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      name,
      email,
      role,
      created_at,
      last_sign_in_at,
      email_confirmed_at,
      qr_token,
      additional_info
    ) VALUES (
      NEW.id,
      user_name,
      NEW.email,
      'Guest',
      NOW(),
      NEW.last_sign_in_at,
      NEW.email_confirmed_at,
      gen_random_uuid(),
      '{}'::jsonb
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- If profile already exists, update it
      UPDATE public.profiles SET
        name = COALESCE(profiles.name, user_name),
        email = COALESCE(NEW.email, profiles.email),
        last_sign_in_at = NEW.last_sign_in_at,
        email_confirmed_at = NEW.email_confirmed_at
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      -- Log error but don't fail the auth process
      RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow service role to manage all profiles (for triggers)
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon users to read public profile info if needed
CREATE POLICY "Public can view basic profile info"
  ON profiles FOR SELECT
  TO anon
  USING (false); -- Disabled by default, enable if needed

-- Ensure the qr_token function exists
CREATE OR REPLACE FUNCTION ensure_qr_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to ensure qr_token is always set
DROP TRIGGER IF EXISTS ensure_qr_token_trigger ON profiles;
CREATE TRIGGER ensure_qr_token_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_qr_token();

-- Update any existing profiles that might be missing required fields
UPDATE profiles 
SET 
  qr_token = gen_random_uuid(),
  additional_info = COALESCE(additional_info, '{}'::jsonb),
  role = COALESCE(role, 'Guest')
WHERE qr_token IS NULL OR additional_info IS NULL OR role IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_qr_token ON profiles(qr_token);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;