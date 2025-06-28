/*
  # Add hide_speakers_gallery column to events table
  
  1. Changes
    - Add hide_speakers_gallery boolean column to events table
    - Set default value to true
    
  2. Security
    - No changes to security policies
*/

ALTER TABLE events ADD COLUMN IF NOT EXISTS hide_speakers_gallery boolean DEFAULT true;