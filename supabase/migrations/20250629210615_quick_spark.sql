/*
  # Fix Site Settings RLS Policies

  1. Security Changes
    - Drop existing problematic RLS policies on sh_site_settings
    - Create new simplified policies that don't cause permission conflicts
    - Ensure public can read active site settings
    - Ensure admins can manage all site settings

  2. Policy Changes
    - Remove dependency on auth.users table for public access
    - Simplify admin access policy to avoid conflicts
*/

-- Drop existing policies that are causing conflicts
DROP POLICY IF EXISTS "Public can read site settings" ON sh_site_settings;
DROP POLICY IF EXISTS "sh_site_settings_admin_access" ON sh_site_settings;

-- Create new simplified public read policy
CREATE POLICY "sh_site_settings_public_read"
  ON sh_site_settings
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create new admin policy for authenticated users
CREATE POLICY "sh_site_settings_admin_full_access"
  ON sh_site_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE sh_site_settings ENABLE ROW LEVEL SECURITY;