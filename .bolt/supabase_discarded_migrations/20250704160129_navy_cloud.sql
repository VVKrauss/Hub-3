/*
  # Create courses table and related structures

  1. New Tables
    - `sh_courses`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `slug` (text, unique, required)
      - `short_description` (text, optional)
      - `description` (text, optional)
      - `course_type` (enum: online, offline, hybrid)
      - `status` (enum: draft, active, archived, completed)
      - `level` (enum: beginner, intermediate, advanced)
      - `category` (text, optional)
      - `tags` (text array)
      - `language_code` (text, default 'sr')
      - `duration_weeks` (integer, optional)
      - `duration_hours` (integer, optional)
      - `start_date` (timestamptz, optional)
      - `end_date` (timestamptz, optional)
      - `enrollment_start` (timestamptz, optional)
      - `enrollment_end` (timestamptz, optional)
      - `max_students` (integer, optional)
      - `current_students` (integer, default 0)
      - `price` (numeric, optional)
      - `currency` (text, default 'RSD')
      - `payment_type` (enum: free, paid, subscription)
      - `cover_image_url` (text, optional)
      - `gallery_images` (text array)
      - `video_url` (text, optional)
      - `syllabus` (jsonb, optional)
      - `requirements` (text array)
      - `learning_outcomes` (text array)
      - `certificate_available` (boolean, default false)
      - `instructor_id` (uuid, foreign key to sh_speakers)
      - `location_type` (text, default 'physical')
      - `venue_name` (text, optional)
      - `venue_address` (text, optional)
      - `online_platform` (text, optional)
      - `online_meeting_url` (text, optional)
      - `is_featured` (boolean, default false)
      - `is_public` (boolean, default true)
      - `meta_title` (text, optional)
      - `meta_description` (text, optional)
      - `meta_keywords` (text array)
      - `created_by` (uuid, optional)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `published_at` (timestamptz, optional)

  2. Enums
    - `sh_course_type` (online, offline, hybrid)
    - `sh_course_status` (draft, active, archived, completed)
    - `sh_course_level` (beginner, intermediate, advanced)
    - `sh_course_payment_type` (free, paid, subscription)

  3. Security
    - Enable RLS on `sh_courses` table
    - Add policies for public read access to active courses
    - Add policies for authenticated users to manage their own courses
*/

-- Create enums for courses
CREATE TYPE sh_course_type AS ENUM ('online', 'offline', 'hybrid');
CREATE TYPE sh_course_status AS ENUM ('draft', 'active', 'archived', 'completed');
CREATE TYPE sh_course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE sh_course_payment_type AS ENUM ('free', 'paid', 'subscription');

-- Create courses table
CREATE TABLE IF NOT EXISTS sh_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  description text,
  course_type sh_course_type DEFAULT 'offline',
  status sh_course_status DEFAULT 'draft',
  level sh_course_level DEFAULT 'beginner',
  category text,
  tags text[] DEFAULT '{}',
  language_code text DEFAULT 'sr',
  duration_weeks integer,
  duration_hours integer,
  start_date timestamptz,
  end_date timestamptz,
  enrollment_start timestamptz,
  enrollment_end timestamptz,
  max_students integer,
  current_students integer DEFAULT 0,
  price numeric(10,2),
  currency text DEFAULT 'RSD',
  payment_type sh_course_payment_type DEFAULT 'free',
  cover_image_url text,
  gallery_images text[] DEFAULT '{}',
  video_url text,
  syllabus jsonb,
  requirements text[],
  learning_outcomes text[],
  certificate_available boolean DEFAULT false,
  instructor_id uuid,
  location_type text DEFAULT 'physical',
  venue_name text,
  venue_address text,
  online_platform text,
  online_meeting_url text,
  is_featured boolean DEFAULT false,
  is_public boolean DEFAULT true,
  meta_title text,
  meta_description text,
  meta_keywords text[],
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  
  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT valid_price CHECK (price IS NULL OR price >= 0),
  CONSTRAINT valid_students CHECK (current_students >= 0 AND (max_students IS NULL OR current_students <= max_students)),
  CONSTRAINT valid_duration CHECK (duration_weeks IS NULL OR duration_weeks > 0),
  CONSTRAINT valid_hours CHECK (duration_hours IS NULL OR duration_hours > 0),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_enrollment CHECK (enrollment_end IS NULL OR enrollment_start IS NULL OR enrollment_end >= enrollment_start)
);

-- Add foreign key constraint to instructor
ALTER TABLE sh_courses 
ADD CONSTRAINT sh_courses_instructor_id_fkey 
FOREIGN KEY (instructor_id) REFERENCES sh_speakers(id) ON DELETE SET NULL;

-- Add foreign key constraint to created_by
ALTER TABLE sh_courses 
ADD CONSTRAINT sh_courses_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES sh_users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_sh_courses_status ON sh_courses(status) WHERE status = 'active';
CREATE INDEX idx_sh_courses_featured ON sh_courses(is_featured) WHERE is_featured = true;
CREATE INDEX idx_sh_courses_category ON sh_courses(category);
CREATE INDEX idx_sh_courses_level ON sh_courses(level);
CREATE INDEX idx_sh_courses_course_type ON sh_courses(course_type);
CREATE INDEX idx_sh_courses_payment_type ON sh_courses(payment_type);
CREATE INDEX idx_sh_courses_instructor ON sh_courses(instructor_id) WHERE instructor_id IS NOT NULL;
CREATE INDEX idx_sh_courses_slug ON sh_courses(slug);
CREATE INDEX idx_sh_courses_start_date ON sh_courses(start_date);
CREATE INDEX idx_sh_courses_created_at ON sh_courses(created_at DESC);
CREATE INDEX idx_sh_courses_tags ON sh_courses USING gin(tags);

-- Enable RLS
ALTER TABLE sh_courses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view active courses"
  ON sh_courses
  FOR SELECT
  TO public
  USING (is_public = true AND status = 'active');

CREATE POLICY "Authenticated users can view all courses"
  ON sh_courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create courses"
  ON sh_courses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can edit their own courses"
  ON sh_courses
  FOR UPDATE
  TO authenticated
  USING (created_by = uid())
  WITH CHECK (created_by = uid());

CREATE POLICY "Users can delete their own courses"
  ON sh_courses
  FOR DELETE
  TO authenticated
  USING (created_by = uid());

-- Create trigger for updated_at
CREATE TRIGGER update_sh_courses_updated_at
  BEFORE UPDATE ON sh_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();