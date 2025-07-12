/*
  # Check and Fix RLS for User Favorites Tables
  
  This migration checks if the user_favorite_speakers and user_favorite_events tables exist,
  enables RLS if needed, and creates proper policies.
  
  1. Check if tables exist
  2. Enable RLS if not enabled
  3. Create proper RLS policies
  4. Verify foreign key relationships
*/

-- Check if user_favorite_speakers table exists and enable RLS
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_favorite_speakers') THEN
    RAISE NOTICE 'Table user_favorite_speakers exists';
    
    -- Enable RLS if not enabled
    ALTER TABLE user_favorite_speakers ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own favorite speakers" ON user_favorite_speakers;
    DROP POLICY IF EXISTS "Users can add their own favorite speakers" ON user_favorite_speakers;
    DROP POLICY IF EXISTS "Users can remove their own favorite speakers" ON user_favorite_speakers;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own favorite speakers"
      ON user_favorite_speakers
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can add their own favorite speakers"
      ON user_favorite_speakers
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Users can remove their own favorite speakers"
      ON user_favorite_speakers
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
      
    RAISE NOTICE 'RLS policies created for user_favorite_speakers';
  ELSE
    RAISE NOTICE 'Table user_favorite_speakers does not exist - creating it';
    
    -- Create the table if it doesn't exist
    CREATE TABLE user_favorite_speakers (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      speaker_id uuid NOT NULL REFERENCES sh_speakers(id) ON DELETE CASCADE,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE (user_id, speaker_id)
    );
    
    -- Enable RLS
    ALTER TABLE user_favorite_speakers ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own favorite speakers"
      ON user_favorite_speakers
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can add their own favorite speakers"
      ON user_favorite_speakers
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Users can remove their own favorite speakers"
      ON user_favorite_speakers
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
      
    RAISE NOTICE 'Table user_favorite_speakers created with RLS policies';
  END IF;
END $$;

-- Check if user_favorite_events table exists and enable RLS
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_favorite_events') THEN
    RAISE NOTICE 'Table user_favorite_events exists';
    
    -- Enable RLS if not enabled
    ALTER TABLE user_favorite_events ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own favorite events" ON user_favorite_events;
    DROP POLICY IF EXISTS "Users can add their own favorite events" ON user_favorite_events;
    DROP POLICY IF EXISTS "Users can remove their own favorite events" ON user_favorite_events;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own favorite events"
      ON user_favorite_events
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can add their own favorite events"
      ON user_favorite_events
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Users can remove their own favorite events"
      ON user_favorite_events
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
      
    RAISE NOTICE 'RLS policies created for user_favorite_events';
  ELSE
    RAISE NOTICE 'Table user_favorite_events does not exist - creating it';
    
    -- Create the table if it doesn't exist
    CREATE TABLE user_favorite_events (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      event_id uuid NOT NULL REFERENCES sh_events(id) ON DELETE CASCADE,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE (user_id, event_id)
    );
    
    -- Enable RLS
    ALTER TABLE user_favorite_events ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own favorite events"
      ON user_favorite_events
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can add their own favorite events"
      ON user_favorite_events
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Users can remove their own favorite events"
      ON user_favorite_events
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
      
    RAISE NOTICE 'Table user_favorite_events created with RLS policies';
  END IF;
END $$;

-- Ensure sh_speakers table has proper RLS policies for public access
DO $$
BEGIN
  -- Enable RLS on sh_speakers if not enabled
  ALTER TABLE sh_speakers ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view active speakers" ON sh_speakers;
  DROP POLICY IF EXISTS "Authenticated users can view speakers" ON sh_speakers;
  
  -- Create policy for public to view active speakers
  CREATE POLICY "Public can view active speakers"
    ON sh_speakers
    FOR SELECT
    TO public
    USING (status = 'active');
    
  -- Create policy for authenticated users to view all speakers
  CREATE POLICY "Authenticated users can view speakers"
    ON sh_speakers
    FOR SELECT
    TO authenticated
    USING (true);
    
  RAISE NOTICE 'RLS policies updated for sh_speakers';
END $$;

-- Ensure sh_events table has proper RLS policies for public access
DO $$
BEGIN
  -- Enable RLS on sh_events if not enabled
  ALTER TABLE sh_events ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view active events" ON sh_events;
  DROP POLICY IF EXISTS "Authenticated users can view events" ON sh_events;
  
  -- Create policy for public to view active events
  CREATE POLICY "Public can view active events"
    ON sh_events
    FOR SELECT
    TO public
    USING (status = 'active' AND is_public = true);
    
  -- Create policy for authenticated users to view all events
  CREATE POLICY "Authenticated users can view events"
    ON sh_events
    FOR SELECT
    TO authenticated
    USING (true);
    
  RAISE NOTICE 'RLS policies updated for sh_events';
END $$;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_favorite_speakers_user_id 
  ON user_favorite_speakers(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_favorite_speakers_speaker_id 
  ON user_favorite_speakers(speaker_id);

CREATE INDEX IF NOT EXISTS idx_user_favorite_events_user_id 
  ON user_favorite_events(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_favorite_events_event_id 
  ON user_favorite_events(event_id);

-- Final verification
DO $$
BEGIN
  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'user_favorite_speakers' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on user_favorite_speakers';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'user_favorite_events' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on user_favorite_events';
  END IF;
  
  RAISE NOTICE 'All RLS configurations verified successfully';
END $$;