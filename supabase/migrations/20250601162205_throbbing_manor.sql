/*
  # Add festival_structure column to events table
  
  1. Changes
    - Add festival_structure column to events table
    - Make it nullable to maintain compatibility with existing records
    
  2. Purpose
    - Store festival program structure and details
    - Support festival-type events with multiple sessions/activities
*/

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS festival_structure text;

COMMENT ON COLUMN events.festival_structure IS 'Stores the structure and details of festival programs';