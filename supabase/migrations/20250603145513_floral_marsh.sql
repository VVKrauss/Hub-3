/*
  # Add registration validation function and trigger

  1. New Functions
    - `validate_registration_data()`: Validates registration data before insert/update
      - Checks required fields (full_name, email)
      - Calculates total tickets
      - Validates against max_registrations limit
      
  2. New Triggers
    - `validate_registration_data_trigger`: Runs validation before INSERT/UPDATE on events table
*/

-- Create validation function
CREATE OR REPLACE FUNCTION public.validate_registration_data()
RETURNS TRIGGER AS $$
DECLARE
    reg_item JSONB;
    calculated_total_tickets INTEGER := 0;
    adult_tix INTEGER;
    child_tix INTEGER;
BEGIN
    -- Check if registrations_list exists and is an array
    IF NEW.registrations_list IS NOT NULL AND jsonb_typeof(NEW.registrations_list) = 'array' THEN
        -- Loop through each registration
        FOR reg_item IN SELECT * FROM jsonb_array_elements(NEW.registrations_list)
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
                calculated_total_tickets := calculated_total_tickets + adult_tix + child_tix;
            END IF;
        END LOOP;
    END IF;

    -- Update current_registration_count
    NEW.current_registration_count := calculated_total_tickets;

    -- Check against max_registrations if set
    IF NEW.max_registrations IS NOT NULL AND NEW.max_registrations > 0 THEN
        IF calculated_total_tickets > NEW.max_registrations THEN
            RAISE EXCEPTION 'Validation error: Total tickets (%) exceeds maximum registrations (%)', 
                calculated_total_tickets, NEW.max_registrations;
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