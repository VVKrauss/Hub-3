ALTER TABLE events 
ADD COLUMN IF NOT EXISTS festival_structure text;

COMMENT ON COLUMN events.festival_structure IS 'Stores the structure and details of festival programs';