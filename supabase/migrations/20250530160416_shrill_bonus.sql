-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION call_event_archiver()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text;
BEGIN
  -- Get the edge function URL from your Supabase settings
  edge_function_url := current_setting('app.settings.edge_function_url');
  
  -- Make HTTP request to the edge function
  PERFORM
    net.http_post(
      url := edge_function_url || '/event-archiver',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
END;
$$;

-- Schedule the function to run every hour
SELECT cron.schedule(
  'archive-past-events',
  '0 * * * *', -- Run at minute 0 of every hour
  'SELECT call_event_archiver()'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION call_event_archiver() TO postgres;