/*
  # Configure storage policies for speaker images
  
  1. Storage Configuration
    - Create storage bucket for images
    - Configure public access settings
  
  2. Security
    - Set up policies for public read access
    - Configure authenticated user permissions for CRUD operations
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public Read Access for Speaker Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images' AND LOWER(name) LIKE 'speakers/%');

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated Users Can Upload Speaker Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images' AND LOWER(name) LIKE 'speakers/%');

-- Create policy for authenticated users to update
CREATE POLICY "Authenticated Users Can Update Speaker Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND LOWER(name) LIKE 'speakers/%');

-- Create policy for authenticated users to delete
CREATE POLICY "Authenticated Users Can Delete Speaker Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND LOWER(name) LIKE 'speakers/%');