
-- Create notices table
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create top_bar_text table (only one record should exist)
CREATE TABLE public.top_bar_text (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint to ensure only one top bar text record
CREATE UNIQUE INDEX unique_top_bar_text ON public.top_bar_text ((1));

-- Create storage bucket for notice images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notice-images',
  'notice-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for notice images bucket
CREATE POLICY "Allow public read access to notice images"
ON storage.objects FOR SELECT
USING (bucket_id = 'notice-images');

CREATE POLICY "Allow authenticated users to upload notice images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notice-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update notice images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'notice-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete notice images"
ON storage.objects FOR DELETE
USING (bucket_id = 'notice-images' AND auth.role() = 'authenticated');
