/*
  # Fix Database Relationships and RLS Policies

  1. Foreign Key Relationships
    - Add missing foreign key constraint between sh_event_speakers and sh_speakers
    - Ensure proper referential integrity

  2. RLS Policy Fixes
    - Fix infinite recursion in sh_users policies
    - Simplify problematic policies to prevent circular dependencies

  3. Verification
    - Verify all relationships are properly established
    - Test policy functionality
*/

-- First, let's add the missing foreign key relationship between sh_event_speakers and sh_speakers
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sh_event_speakers_speaker_id_fkey' 
    AND table_name = 'sh_event_speakers'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE sh_event_speakers 
    ADD CONSTRAINT sh_event_speakers_speaker_id_fkey 
    FOREIGN KEY (speaker_id) REFERENCES sh_speakers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix the infinite recursion issue in sh_users RLS policies
-- First, drop the problematic policies
DROP POLICY IF EXISTS "profiles_view_policy" ON sh_users;

-- Recreate the policies with simpler logic to avoid recursion
CREATE POLICY "sh_users_select_own_simple" ON sh_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "sh_users_select_admin_simple" ON sh_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Ensure sh_site_settings policies don't cause recursion
DROP POLICY IF EXISTS "Admins can modify site settings" ON sh_site_settings;

CREATE POLICY "sh_site_settings_admin_access" ON sh_site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Verify the foreign key relationship exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sh_event_speakers_speaker_id_fkey' 
    AND table_name = 'sh_event_speakers'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint was not created successfully';
  END IF;
END $$;

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_sh_event_speakers_speaker_id_performance 
ON sh_event_speakers(speaker_id) 
WHERE speaker_id IS NOT NULL;

-- Ensure RLS is enabled on all necessary tables
ALTER TABLE sh_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_site_settings ENABLE ROW LEVEL SECURITY;