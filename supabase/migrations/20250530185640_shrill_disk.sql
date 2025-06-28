/*
  # Add coworking header table

  1. New Tables
    - `coworking_header`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `coworking_header` table
    - Add policy for authenticated users to update header data
    - Add policy for public users to view header data
*/

-- Create coworking header table
CREATE TABLE IF NOT EXISTS public.coworking_header (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coworking_header ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can update coworking header"
  ON public.coworking_header
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view coworking header"
  ON public.coworking_header
  FOR SELECT
  TO public
  USING (true);

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_coworking_header_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coworking_header_updated_at
  BEFORE UPDATE ON public.coworking_header
  FOR EACH ROW
  EXECUTE FUNCTION update_coworking_header_updated_at();