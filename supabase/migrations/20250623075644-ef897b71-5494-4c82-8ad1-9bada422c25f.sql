
-- Remove discount_unit column from subcategories table
ALTER TABLE public.subcategories DROP COLUMN IF EXISTS discount_unit;

-- Create product_images table if it doesn't exist (for storing multiple images per product)
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_variant_id UUID REFERENCES public.color_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update color_variants table structure if needed
ALTER TABLE public.color_variants 
DROP COLUMN IF EXISTS color_code,
ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT FALSE;

-- Enable RLS on new tables
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_images
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
CREATE POLICY "Anyone can view product images" ON public.product_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL USING (public.is_admin());

-- Add size field to size_variants if not exists
ALTER TABLE public.size_variants 
ADD COLUMN IF NOT EXISTS size_code TEXT;
