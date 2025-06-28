/*
  # Improve registration validation function
  
  1. Changes
    - Update validate_registration_data function to handle registration updates
    - Add better error handling and validation
    - Ensure atomic updates of registration counts
    
  2. Purpose
    - Ensure data consistency when updating registrations
    - Prevent race conditions during concurrent updates
    - Maintain accurate registration statistics
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.validate_registration_data();

-- Create improved validation function
CREATE OR REPLACE FUNCTION public.validate_registration_data()
RETURNS TRIGGER AS $$
DECLARE
    reg_item JSONB;
    calculated_total INTEGER := 0;
    calculated_adults INTEGER := 0;
    calculated_children INTEGER := 0;
    adult_tix INTEGER;
    child_tix INTEGER;
    log_message TEXT;
BEGIN
    -- Log the operation for debugging
    log_message := 'Processing ' || TG_OP || ' operation on event ID: ' || NEW.id;
    RAISE NOTICE '%', log_message;

    -- Initialize registrations if NULL
    IF NEW.registrations IS NULL THEN
        NEW.registrations := jsonb_build_object(
            'max_regs', NEW.max_registrations,
            'current', 0,
            'current_adults', 0,
            'current_children', 0,
            'reg_list', COALESCE(NEW.registrations_list, '[]'::jsonb)
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

    -- For backward compatibility, also update legacy fields
    NEW.current_registration_count := calculated_total;

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

-- Create trigger
DROP TRIGGER IF EXISTS validate_registration_data_trigger ON public.events;

CREATE TRIGGER validate_registration_data_trigger
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_registration_data();

-- Add comment to function
COMMENT ON FUNCTION public.validate_registration_data IS 'Validates registration data and updates registration count';