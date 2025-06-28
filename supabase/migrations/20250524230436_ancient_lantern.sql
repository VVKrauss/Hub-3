/*
  # Add Event Registrations Support

  1. Changes
    - Add registrations_list JSONB column to events table
    - Add registration_enabled boolean column to events table
    - Add registration_deadline timestamp column to events table
    - Add registration_limit_per_user integer column to events table

  2. Data Structure
    registrations_list will contain an array of objects with:
    - id (UUID)
    - full_name (string)
    - email (string)
    - adult_tickets (integer)
    - child_tickets (integer)
    - total_amount (numeric)
    - status (boolean)
    - qr_code (string)
    - created_at (timestamp)
*/

-- Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registrations_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registration_limit_per_user INTEGER DEFAULT 5;

-- Create a function to validate registration data
CREATE OR REPLACE FUNCTION validate_registration_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate registration_list entries
  IF (NEW.registrations_list IS NOT NULL) THEN
    IF NOT (
      SELECT bool_and(
        (value->>'id') IS NOT NULL AND
        (value->>'full_name') IS NOT NULL AND
        (value->>'email') IS NOT NULL AND
        (value->>'adult_tickets') IS NOT NULL AND
        (value->>'child_tickets') IS NOT NULL AND
        (value->>'total_amount') IS NOT NULL AND
        (value->>'status') IS NOT NULL AND
        (value->>'qr_code') IS NOT NULL AND
        (value->>'created_at') IS NOT NULL
      )
      FROM jsonb_array_elements(NEW.registrations_list)
    ) THEN
      RAISE EXCEPTION 'Invalid registration data structure';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for data validation
DROP TRIGGER IF EXISTS validate_registration_data_trigger ON events;
CREATE TRIGGER validate_registration_data_trigger
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_registration_data();