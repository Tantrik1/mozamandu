-- Add image_url column to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for category images - public read
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- Admin can manage category images
CREATE POLICY "Admins can manage category images"
ON storage.objects FOR ALL
USING (bucket_id = 'category-images' AND is_admin())
WITH CHECK (bucket_id = 'category-images' AND is_admin());