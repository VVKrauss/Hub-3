/*
  # Add event archiving fields
  
  1. Changes
    - Add current_registration_count column if not exists
    - Add check constraint for valid status values
    - Add index on date and status for better query performance
    
  2. Security
    - No changes to security policies
*/

-- Add current_registration_count column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' 
    AND column_name = 'current_registration_count'
  ) THEN
    ALTER TABLE events 
    ADD COLUMN current_registration_count integer DEFAULT 0;
  END IF;
END $$;

-- Add check constraint for status values
ALTER TABLE events
DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
ADD CONSTRAINT events_status_check
CHECK (status IN ('active', 'draft', 'past'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_date_status 
ON events(date, status);