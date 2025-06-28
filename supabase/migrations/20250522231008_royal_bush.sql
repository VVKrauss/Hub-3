/*
  # Storage bucket policies for speaker images
  
  1. Changes
    - Create storage bucket for images if it doesn't exist
    - Set up bucket-level policies for speaker images
    
  2. Security
    - Public read access for speaker images
    - Authenticated users can upload/update/delete speaker images
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('images', 'images')
ON CONFLICT (id) DO NOTHING;

-- Create bucket-level policies
BEGIN;
  -- Policy for public read access
  CREATE POLICY "Public Access"
  ON storage.buckets FOR SELECT
  TO public
  USING (name = 'images');

  -- Policy for authenticated users to upload files
  CREATE POLICY "Authenticated Upload Access"
  ON storage.buckets FOR INSERT
  TO authenticated
  WITH CHECK (name = 'images');

  -- Policy for authenticated users to update files
  CREATE POLICY "Authenticated Update Access"
  ON storage.buckets FOR UPDATE
  TO authenticated
  USING (name = 'images');

  -- Policy for authenticated users to delete files
  CREATE POLICY "Authenticated Delete Access"
  ON storage.buckets FOR DELETE
  TO authenticated
  USING (name = 'images');
COMMIT;