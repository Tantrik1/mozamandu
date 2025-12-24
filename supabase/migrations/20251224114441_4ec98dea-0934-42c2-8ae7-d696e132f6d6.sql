
-- Fix function search paths for security
ALTER FUNCTION public.generate_product_sku(TEXT, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.safe_update_stock(UUID, INTEGER, UUID, UUID, INTEGER, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Add missing columns to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material_composition TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS care_instructions TEXT;

-- Add missing columns to color_variants table  
ALTER TABLE public.color_variants ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;

-- Add missing columns to size_variants table
ALTER TABLE public.size_variants ADD COLUMN IF NOT EXISTS size_code TEXT;

-- Add missing column to delivery_charges table
ALTER TABLE public.delivery_charges ADD COLUMN IF NOT EXISTS delivery_price DECIMAL(10,2) DEFAULT 0;

-- Add missing column to notices table  
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS description TEXT;

-- Create product_images table for additional images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage product images" ON public.product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create colors table for color management
CREATE TABLE IF NOT EXISTS public.colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hex_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view colors" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Admins can manage colors" ON public.colors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Update delivery_charges to sync charge and delivery_price
UPDATE public.delivery_charges SET delivery_price = charge WHERE delivery_price IS NULL OR delivery_price = 0;
