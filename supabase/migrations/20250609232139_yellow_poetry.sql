-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_page_popularity(timestamp with time zone, timestamp with time zone, boolean);

-- Create the corrected function with proper return types
CREATE OR REPLACE FUNCTION get_page_popularity(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  exclude_admin boolean DEFAULT true
)
RETURNS TABLE (
  page text,
  visits bigint,
  avg_time_spent numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.path as page,
    COUNT(*)::bigint as visits,
    COALESCE(AVG(pv.time_spent), 0)::numeric as avg_time_spent
  FROM page_views pv
  WHERE 
    pv.created_at >= start_date 
    AND pv.created_at <= end_date
    AND (NOT exclude_admin OR pv.is_admin = false)
  GROUP BY pv.path
  ORDER BY visits DESC;
END;
$$;