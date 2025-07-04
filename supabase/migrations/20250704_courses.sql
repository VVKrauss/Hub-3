/*
  # Create Courses Table and Policies
  
  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `title` (text)
      - `slug` (text, unique)
      - `short_description` (text)
      - `description` (text)
      - `course_type` (enum: 'online', 'offline', 'hybrid')
      - `status` (enum: 'draft', 'active', 'archived', 'completed')
      - `level` (enum: 'beginner', 'intermediate', 'advanced')
      - `category` (text)
      - `tags` (text array)
      - `language_code` (text, default 'ru')
      - `duration_weeks` (integer)
      - `duration_hours` (integer)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `enrollment_start` (timestamptz)
      - `enrollment_end` (timestamptz)
      - `max_students` (integer)
      - `current_students` (integer, default 0)
      - `price` (decimal)
      - `currency` (text, default 'RUB')
      - `payment_type` (enum: 'free', 'paid', 'subscription')
      - `cover_image_url` (text)
      - `gallery_images` (text array)
      - `video_url` (text)
      - `syllabus` (jsonb)
      - `requirements` (text array)
      - `learning_outcomes` (text array)
      - `certificate_available` (boolean, default false)
      - `instructor_id` (uuid, references speakers)
      - `location_type` (text: 'online', 'venue', 'hybrid')
      - `venue_name` (text)
      - `venue_address` (text)
      - `online_platform` (text)
      - `online_meeting_url` (text)
      - `is_featured` (boolean, default false)
      - `is_public` (boolean, default true)
      - `meta_title` (text)
      - `meta_description` (text)
      - `meta_keywords` (text array)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `published_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public can view active/published courses
    - Only authenticated users can manage courses
*/

-- Create course_type enum
CREATE TYPE course_type AS ENUM ('online', 'offline', 'hybrid');

-- Create course_status enum  
CREATE TYPE course_status AS ENUM ('draft', 'active', 'archived', 'completed');

-- Create course_level enum
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create course_payment_type enum
CREATE TYPE course_payment_type AS ENUM ('free', 'paid', 'subscription');

-- Create courses table
CREATE TABLE courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  description text,
  course_type course_type NOT NULL DEFAULT 'offline',
  status course_status NOT NULL DEFAULT 'draft',
  level course_level NOT NULL DEFAULT 'beginner',
  category text,
  tags text[] DEFAULT '{}',
  language_code text DEFAULT 'ru',
  duration_weeks integer,
  duration_hours integer,
  start_date timestamptz,
  end_date timestamptz,
  enrollment_start timestamptz,
  enrollment_end timestamptz,
  max_students integer,
  current_students integer DEFAULT 0,
  price decimal(10,2),
  currency text DEFAULT 'RUB',
  payment_type course_payment_type DEFAULT 'free',
  cover_image_url text,
  gallery_images text[] DEFAULT '{}',
  video_url text,
  syllabus jsonb,
  requirements text[] DEFAULT '{}',
  learning_outcomes text[] DEFAULT '{}',
  certificate_available boolean DEFAULT false,
  instructor_id uuid REFERENCES speakers(id) ON DELETE SET NULL,
  location_type text DEFAULT 'offline',
  venue_name text,
  venue_address text,
  online_platform text,
  online_meeting_url text,
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  meta_title text,
  meta_description text,
  meta_keywords text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view published courses"
ON courses
FOR SELECT
TO public
USING (status = 'active' AND is_public = true);

CREATE POLICY "Authenticated users can view all courses"
ON courses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create courses"
ON courses
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update courses"
ON courses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete courses"
ON courses
FOR DELETE
TO authenticated
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_start_date ON courses(start_date);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_featured ON courses(is_featured);
CREATE INDEX idx_courses_slug ON courses(slug);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE
  ON courses
  FOR EACH ROW
  EXECUTE PROCEDURE update_courses_updated_at();

-- Add storage policies for course images
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for course images
CREATE POLICY "Public can view course images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'courses');

-- Authenticated users can manage course images
CREATE POLICY "Authenticated users can upload course images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'courses');

CREATE POLICY "Authenticated users can update course images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'courses');

CREATE POLICY "Authenticated users can delete course images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'courses'); 