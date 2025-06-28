/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Drop existing problematic policies that cause infinite recursion
    - Create new policies that don't reference the profiles table recursively
    - Use auth.jwt() claims or simpler conditions to avoid recursion

  2. Policy Changes
    - Remove admin policies that query profiles table within profiles policies
    - Keep basic user access policies that use auth.uid() directly
    - Add a simple policy structure that avoids recursive queries
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public can view own profile" ON profiles;

-- Create new policies without recursion
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Admin functionality will need to be handled differently
-- Consider using service role key for admin operations or 
-- implementing admin checks in application logic rather than RLS policies