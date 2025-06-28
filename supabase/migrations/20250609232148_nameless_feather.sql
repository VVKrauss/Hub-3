-- Drop the existing functions
DROP FUNCTION IF EXISTS get_page_view_stats(timestamp with time zone, timestamp with time zone, boolean);
DROP FUNCTION IF EXISTS get_page_popularity(timestamp with time zone, timestamp with time zone, boolean);

-- Recreate get_page_view_stats with correct return types
CREATE OR REPLACE FUNCTION get_page_view_stats(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  exclude_admin BOOLEAN DEFAULT true
)
RETURNS TABLE (
  date DATE,
  visitors BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as visitors,
    COUNT(DISTINCT session_id)::BIGINT as unique_visitors
  FROM page_views
  WHERE 
    created_at >= start_date AND 
    created_at <= end_date AND
    (NOT exclude_admin OR is_admin = false)
  GROUP BY DATE(created_at)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Recreate get_page_popularity with correct return types
CREATE OR REPLACE FUNCTION get_page_popularity(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  exclude_admin BOOLEAN DEFAULT true
)
RETURNS TABLE (
  page TEXT,
  visits BIGINT,
  avg_time_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    path as page,
    COUNT(*)::BIGINT as visits,
    COALESCE(AVG(time_spent)::NUMERIC, 0) as avg_time_spent
  FROM page_views
  WHERE 
    created_at >= start_date AND 
    created_at <= end_date AND
    (NOT exclude_admin OR is_admin = false)
  GROUP BY path
  ORDER BY visits DESC;
END;
$$ LANGUAGE plpgsql;