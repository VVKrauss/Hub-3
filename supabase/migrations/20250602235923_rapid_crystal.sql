/*
  # Fix festival program column name
  
  1. Changes
    - Add festival_program column if it doesn't exist
    - Copy data from old column if it exists
    - Drop old column if it exists
    
  2. Purpose
    - Safely rename column without data loss
    - Handle cases where old column may not exist
*/

DO $$ 
BEGIN
  -- Add new column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'festival_program'
  ) THEN
    ALTER TABLE events 
    ADD COLUMN festival_program jsonb DEFAULT NULL;
  END IF;

  -- Copy data from old column if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'festival_programm'
  ) THEN
    UPDATE events 
    SET festival_program = festival_programm::jsonb;

    ALTER TABLE events 
    DROP COLUMN festival_programm;
  END IF;
END $$;

COMMENT ON COLUMN events.festival_program IS 'Stores the structure and details of festival programs';