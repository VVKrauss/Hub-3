/*
  # Add new registrations structure
  
  1. Changes
    - Add registrations JSONB column to events table
    - Migrate existing data from registrations_list to new structure
    - Update validation function to work with new structure
    
  2. Purpose
    - Improve data organization and validation
    - Support more efficient registration management
    - Maintain backward compatibility during transition
*/

-- Add new registrations column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registrations JSONB DEFAULT NULL;

-- Migrate existing data to new structure
UPDATE events
SET registrations = jsonb_build_object(
  'max_regs', max_registrations,
  'current', current_registration_count,
  'current_adults', (
    SELECT COALESCE(SUM((r->>'adult_tickets')::int), 0)
    FROM jsonb_array_elements(registrations_list) r
    WHERE (r->>'status')::boolean = true
  ),
  'current_children', (
    SELECT COALESCE(SUM((r->>'child_tickets')::int), 0)
    FROM jsonb_array_elements(registrations_list) r
    WHERE (r->>'status')::boolean = true
  ),
  'reg_list', COALESCE(registrations_list, '[]'::jsonb)
)
WHERE registrations_list IS NOT NULL OR max_registrations IS NOT NULL;

-- Update validation function for new structure
CREATE OR REPLACE FUNCTION public.validate_registration_data()
RETURNS TRIGGER AS $$
DECLARE
    reg_item JSONB;
    calculated_total INTEGER := 0;
    calculated_adults INTEGER := 0;
    calculated_children INTEGER := 0;
    adult_tix INTEGER;
    child_tix INTEGER;
BEGIN
    -- Initialize registrations if NULL
    IF NEW.registrations IS NULL THEN
        NEW.registrations := jsonb_build_object(
            'max_regs', NULL,
            'current', 0,
            'current_adults', 0,
            'current_children', 0,
            'reg_list', '[]'::jsonb
        );
    END IF;

    -- Check if reg_list exists and is an array
    IF NEW.registrations->'reg_list' IS NOT NULL AND jsonb_typeof(NEW.registrations->'reg_list') = 'array' THEN
        -- Loop through each registration
        FOR reg_item IN SELECT * FROM jsonb_array_elements(NEW.registrations->'reg_list')
        LOOP
            -- Validate required fields
            IF (reg_item->>'full_name' IS NULL OR trim(reg_item->>'full_name') = '') THEN
                RAISE EXCEPTION 'Validation error: full_name is required for registration ID %', reg_item->>'id';
            END IF;

            IF (reg_item->>'email' IS NULL OR trim(reg_item->>'email') = '') THEN
                RAISE EXCEPTION 'Validation error: email is required for registration ID %', reg_item->>'id';
            END IF;

            -- Calculate total tickets
            adult_tix := COALESCE((reg_item->>'adult_tickets')::INTEGER, 0);
            child_tix := COALESCE((reg_item->>'child_tickets')::INTEGER, 0);

            -- Validate ticket counts
            IF adult_tix < 0 OR child_tix < 0 THEN
                RAISE EXCEPTION 'Validation error: ticket counts cannot be negative';
            END IF;

            -- Sum up tickets for active registrations only
            IF (reg_item->>'status')::BOOLEAN THEN
                calculated_adults := calculated_adults + adult_tix;
                calculated_children := calculated_children + child_tix;
                calculated_total := calculated_total + adult_tix + child_tix;
            END IF;
        END LOOP;
    END IF;

    -- Update registration counts
    NEW.registrations := jsonb_set(NEW.registrations, '{current}', to_jsonb(calculated_total));
    NEW.registrations := jsonb_set(NEW.registrations, '{current_adults}', to_jsonb(calculated_adults));
    NEW.registrations := jsonb_set(NEW.registrations, '{current_children}', to_jsonb(calculated_children));

    -- Check against max_regs if set
    IF NEW.registrations->'max_regs' IS NOT NULL AND (NEW.registrations->>'max_regs')::INTEGER > 0 THEN
        IF calculated_total > (NEW.registrations->>'max_regs')::INTEGER THEN
            RAISE EXCEPTION 'Validation error: Total tickets (%) exceeds maximum registrations (%)', 
                calculated_total, (NEW.registrations->>'max_regs')::INTEGER;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create hourly event archiver trigger function
CREATE OR REPLACE FUNCTION hourly_event_archiver_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This function will be called by a scheduled job
    -- It doesn't need to do anything here as the actual archiving
    -- is handled by the edge function
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event archiving
DROP TRIGGER IF EXISTS hourly_event_archiver ON events;
CREATE TRIGGER hourly_event_archiver
    AFTER INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION hourly_event_archiver_trigger();

-- Keep old columns for now to ensure backward compatibility
-- They can be removed in a future migration after all code is updated