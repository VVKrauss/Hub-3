/*
  # Configure RLS policies for events table and storage
  
  1. Events Table Policies
    - Enable RLS on events table
    - Set up policies for CRUD operations
    
  2. Storage Policies
    - Configure policies for events images
    - Set up public read access
    - Allow authenticated users to manage images
*/

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
CREATE POLICY "Public can view events"
ON events
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create events"
ON events
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update events"
ON events
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete events"
ON events
FOR DELETE
TO authenticated
USING (true);

-- Configure storage policies for events
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for event images
CREATE POLICY "Public can view event images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images' AND (LOWER(name) LIKE 'events/%' OR LOWER(name) LIKE 'speakers/%'));

-- Authenticated users can manage event images
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images' AND (LOWER(name) LIKE 'events/%' OR LOWER(name) LIKE 'speakers/%'));

CREATE POLICY "Authenticated users can update event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND (LOWER(name) LIKE 'events/%' OR LOWER(name) LIKE 'speakers/%'));

CREATE POLICY "Authenticated users can delete event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND (LOWER(name) LIKE 'events/%' OR LOWER(name) LIKE 'speakers/%'));