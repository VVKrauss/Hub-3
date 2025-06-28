ALTER TABLE events 
ADD COLUMN IF NOT EXISTS festival_programm jsonb DEFAULT NULL;

COMMENT ON COLUMN events.festival_programm IS 'Stores the structure and details of festival programs';