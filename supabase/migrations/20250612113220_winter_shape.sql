/*
  # Add storage policies for rent photos
  
  1. Changes
    - Add storage policies for rent photos in the images bucket
    - Allow public read access to rent photos
    - Allow authenticated users to manage rent photos
    
  2. Security
    - Public can view rent photos
    - Only authenticated users can upload/update/delete rent photos
*/

-- Create policies for rent photos in the images bucket
DO $$ 
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Public can view rent photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload rent photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update rent photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete rent photos" ON storage.objects;
    
    -- Create new policies
    CREATE POLICY "Public can view rent photos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'rent_photos');

    CREATE POLICY "Authenticated users can upload rent photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = 'rent_photos');

    CREATE POLICY "Authenticated users can update rent photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'rent_photos');

    CREATE POLICY "Authenticated users can delete rent photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'images' AND (storage.foldername(name))[1] = 'rent_photos');
END $$;