/*
  # Create page_views table for analytics
  
  1. New Tables
    - `page_views`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `path` (text)
      - `user_id` (uuid, references auth.users)
      - `session_id` (text)
      - `referrer` (text)
      - `user_agent` (text)
      - `time_spent` (integer)
      
  2. Security
    - Enable RLS
    - Public can insert page views
    - Only authenticated users can view analytics
*/

-- Create page_views table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  path TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  time_spent INTEGER,
  is_admin BOOLEAN DEFAULT false
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can insert page views"
ON page_views
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Authenticated users can view page views"
ON page_views
FOR SELECT
TO authenticated
USING (true);

-- Create function to get page view statistics
CREATE OR REPLACE FUNCTION get_page_view_stats(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  exclude_admin BOOLEAN DEFAULT true
)
RETURNS TABLE (
  date DATE,
  visitors INTEGER,
  unique_visitors INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*) as visitors,
    COUNT(DISTINCT session_id) as unique_visitors
  FROM page_views
  WHERE 
    created_at >= start_date AND 
    created_at <= end_date AND
    (NOT exclude_admin OR is_admin = false)
  GROUP BY DATE(created_at)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Create function to get page popularity
CREATE OR REPLACE FUNCTION get_page_popularity(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  exclude_admin BOOLEAN DEFAULT true
)
RETURNS TABLE (
  page TEXT,
  visits INTEGER,
  avg_time_spent INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    path as page,
    COUNT(*) as visits,
    COALESCE(AVG(time_spent)::INTEGER, 0) as avg_time_spent
  FROM page_views
  WHERE 
    created_at >= start_date AND 
    created_at <= end_date AND
    (NOT exclude_admin OR is_admin = false)
  GROUP BY path
  ORDER BY visits DESC;
END;
$$ LANGUAGE plpgsql;