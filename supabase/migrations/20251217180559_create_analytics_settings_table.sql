-- Create table for storing Google Analytics/Search Console API settings
CREATE TABLE IF NOT EXISTS public.analytics_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.analytics_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics settings
CREATE POLICY "Only admins can view analytics settings"
  ON public.analytics_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert analytics settings
CREATE POLICY "Only admins can insert analytics settings"
  ON public.analytics_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update analytics settings
CREATE POLICY "Only admins can update analytics settings"
  ON public.analytics_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete analytics settings
CREATE POLICY "Only admins can delete analytics settings"
  ON public.analytics_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_analytics_settings_timestamp
  BEFORE UPDATE ON public.analytics_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_settings_updated_at();
