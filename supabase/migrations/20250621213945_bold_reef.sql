/*
  # Allow NULL values for price field in events table
  
  1. Changes
    - Modify price column in events table to allow NULL values
    
  2. Purpose
    - Support "online payment only" option for events
    - Allow events without a direct price but with an online payment link
*/

-- Alter price column to allow NULL values
ALTER TABLE events 
ALTER COLUMN price DROP NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN events.price IS 'Price for the event. NULL indicates online payment only.';