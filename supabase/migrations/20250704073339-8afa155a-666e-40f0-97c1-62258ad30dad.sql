
-- Enable the required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run the low stock alert daily at 6 PM
SELECT cron.schedule(
  'daily-low-stock-alert',
  '0 18 * * *', -- Run at 6 PM (18:00) every day
  $$
  SELECT
    net.http_post(
        url:='https://huwhbxjlyucamitwwhyg.supabase.co/functions/v1/low-stock-alert',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2hieGpseXVjYW1pdHd3aHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTg4NTcsImV4cCI6MjA2NjIzNDg1N30.cB3YipySfkizYpvwUPd9xlBlq_haPznmEpPgcbAwovQ"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
