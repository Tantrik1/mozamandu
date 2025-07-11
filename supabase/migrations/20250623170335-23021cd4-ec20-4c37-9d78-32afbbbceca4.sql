
-- Add image_url column to subcategories table
ALTER TABLE public.subcategories 
ADD COLUMN image_url TEXT;

-- Create storage bucket for subcategory images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subcategory-images', 
  'subcategory-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage policy for subcategory images - allow all operations for public access
CREATE POLICY "Allow public access to subcategory images" 
ON storage.objects FOR ALL 
USING (bucket_id = 'subcategory-images');
