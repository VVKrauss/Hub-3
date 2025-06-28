/*
  # Add Payment Link Clicks Counter

  1. Changes
    - Add payment_link_clicks column to events table to track clicks
    - Set default value to 0
    - Make column nullable
*/

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS payment_link_clicks INTEGER DEFAULT 0;