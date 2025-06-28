/*
  # Add storage policies for image uploads

  1. Storage Policies
    - Enable authenticated users to upload images
    - Allow public read access to images
    - Allow authenticated users to delete their own images

  2. Changes
    - Add storage bucket policies for images
*/

-- Create storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Policy to allow authenticated users to upload files
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images'
);

-- Policy to allow public read access to images
create policy "Public can view images"
on storage.objects for select
to public
using (
  bucket_id = 'images'
);

-- Policy to allow authenticated users to delete their own images
create policy "Authenticated users can delete own images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'images' AND
  auth.uid() = owner
);