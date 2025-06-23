
-- Fix database consistency for size variants
-- Ensure color_variants.has_sizes aligns with products.has_size_variants

-- Update color_variants to have has_sizes = true for products that have size variants
UPDATE public.color_variants 
SET has_sizes = true 
WHERE product_id IN (
  SELECT id FROM public.products 
  WHERE has_size_variants = true
);

-- Update color_variants to have has_sizes = false for products that don't have size variants
UPDATE public.color_variants 
SET has_sizes = false 
WHERE product_id IN (
  SELECT id FROM public.products 
  WHERE has_size_variants = false
);

-- Add index for better performance on stock calculations
CREATE INDEX IF NOT EXISTS idx_size_variants_color_variant_id ON public.size_variants(color_variant_id);
CREATE INDEX IF NOT EXISTS idx_color_variants_product_id ON public.color_variants(product_id);
