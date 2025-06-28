/*
  # Add description column to coworking_info_table

  1. Changes
    - Add 'description' column to 'coworking_info_table'
    - Make it nullable to maintain compatibility with existing records
    - Add comment to describe the column's purpose

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

ALTER TABLE coworking_info_table
ADD COLUMN IF NOT EXISTS "discription" text;

-- Fix typo in column name
ALTER TABLE coworking_info_table
RENAME COLUMN "discription" TO "description";

COMMENT ON COLUMN coworking_info_table.description IS 'Detailed description of the coworking service';