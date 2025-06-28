-- Add order column with default value
ALTER TABLE coworking_info_table 
ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 1;

-- Update existing rows with sequential order based on id
WITH ordered_services AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as new_order
  FROM coworking_info_table
)
UPDATE coworking_info_table
SET "order" = ordered_services.new_order
FROM ordered_services
WHERE coworking_info_table.id = ordered_services.id;