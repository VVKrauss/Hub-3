/*
  # Update storage policies for speaker images
  
  1. Changes
    - Configure storage policies for speaker images
    - Ensure public read access
    - Allow authenticated users to manage images
    
  2. Security
    - Public can view speaker images
    - Authenticated users can manage speaker images
*/

-- Ensure the images bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to read speaker images
CREATE POLICY "Public can view speaker images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'images' 
  AND (LOWER(name) LIKE 'speakers/%')
);

-- Allow authenticated users to upload speaker images
CREATE POLICY "Authenticated users can upload speaker images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images' 
  AND (LOWER(name) LIKE 'speakers/%')
);

-- Allow authenticated users to update speaker images
CREATE POLICY "Authenticated users can update speaker images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (LOWER(name) LIKE 'speakers/%')
);

-- Allow authenticated users to delete speaker images
CREATE POLICY "Authenticated users can delete speaker images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images' 
  AND (LOWER(name) LIKE 'speakers/%')
);