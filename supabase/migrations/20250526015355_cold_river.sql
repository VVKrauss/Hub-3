/*
  # Create Time Slots Table
  
  1. New Tables
    - `time_slots_table`
      - `id` (text, primary key)
      - `date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `slot_details` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS
    - Public can view time slots
    - Authenticated users can manage time slots
    
  3. Data Migration
    - Migrate existing events to time slots
*/

-- Create time slots table
CREATE TABLE IF NOT EXISTS time_slots_table (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_details jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE time_slots_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view time slots"
ON time_slots_table
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can manage time slots"
ON time_slots_table
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_time_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE
  ON time_slots_table
  FOR EACH ROW
  EXECUTE PROCEDURE update_time_slots_updated_at();

-- Migrate existing events to time slots
INSERT INTO time_slots_table (
  id,
  date,
  start_time,
  end_time,
  slot_details
)
SELECT
  gen_random_uuid(),
  date::date,
  start_time::time,
  end_time::time,
  jsonb_build_object(
    'type', 'event',
    'uuid', id,
    'title', title,
    'contact', 'Science Hub'
  )
FROM events
WHERE status = 'active';

-- Create trigger for automatically creating time slots for new events
CREATE OR REPLACE FUNCTION create_time_slot_for_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO time_slots_table (
      date,
      start_time,
      end_time,
      slot_details
    ) VALUES (
      NEW.date::date,
      NEW.start_time::time,
      NEW.end_time::time,
      jsonb_build_object(
        'type', 'event',
        'uuid', NEW.id,
        'title', NEW.title,
        'contact', 'Science Hub'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_time_slot_for_event_trigger
  AFTER INSERT
  ON events
  FOR EACH ROW
  EXECUTE PROCEDURE create_time_slot_for_event();