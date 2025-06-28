/*
  # Remove visitor analytics tables and functions
  
  1. Changes
    - Drop page_views table
    - Drop analytics functions
    
  2. Purpose
    - Remove visitor tracking functionality
    - Clean up database schema
*/

-- Drop analytics functions
DROP FUNCTION IF EXISTS get_page_view_stats(timestamp with time zone, timestamp with time zone, boolean);
DROP FUNCTION IF EXISTS get_page_popularity(timestamp with time zone, timestamp with time zone, boolean);
DROP FUNCTION IF EXISTS get_detailed_page_stats(timestamp with time zone, timestamp with time zone, boolean);
DROP FUNCTION IF EXISTS get_traffic_by_hour(timestamp with time zone, timestamp with time zone, boolean);
DROP FUNCTION IF EXISTS get_traffic_by_day(timestamp with time zone, timestamp with time zone, boolean);

-- Drop page_views table
DROP TABLE IF EXISTS page_views;