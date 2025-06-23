
-- Add stock_quantity to products table for products without variants
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Add stock_quantity to color_variants table for color-based stock
ALTER TABLE public.color_variants 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Update size_variants to ensure stock_quantity exists
ALTER TABLE public.size_variants 
ALTER COLUMN stock_quantity SET DEFAULT 0,
ALTER COLUMN stock_quantity SET NOT NULL;

-- Create indexes for better performance on stock queries
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_color_variants_stock ON public.color_variants(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_size_variants_stock ON public.size_variants(stock_quantity);

-- Add constraints to ensure stock quantities are non-negative (using DO block for conditional creation)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_products_stock_non_negative'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT check_products_stock_non_negative 
        CHECK (stock_quantity >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_color_variants_stock_non_negative'
    ) THEN
        ALTER TABLE public.color_variants 
        ADD CONSTRAINT check_color_variants_stock_non_negative 
        CHECK (stock_quantity >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_size_variants_stock_non_negative'
    ) THEN
        ALTER TABLE public.size_variants 
        ADD CONSTRAINT check_size_variants_stock_non_negative 
        CHECK (stock_quantity >= 0);
    END IF;
END $$;

-- Update product_images table to better organize images
ALTER TABLE public.product_images 
ADD COLUMN IF NOT EXISTS image_type TEXT DEFAULT 'main',
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add check constraint for image types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_image_type'
    ) THEN
        ALTER TABLE public.product_images 
        ADD CONSTRAINT check_image_type 
        CHECK (image_type IN ('main', 'variant', 'gallery'));
    END IF;
END $$;

-- Create function to calculate total stock for a product
CREATE OR REPLACE FUNCTION public.calculate_product_stock(product_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_stock INTEGER := 0;
  has_color_variants BOOLEAN;
  has_size_variants BOOLEAN;
BEGIN
  -- Get product variant flags
  SELECT p.has_color_variants, p.has_size_variants 
  INTO has_color_variants, has_size_variants
  FROM public.products p 
  WHERE p.id = product_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- If product has size variants, sum from size_variants
  IF has_color_variants AND has_size_variants THEN
    SELECT COALESCE(SUM(sv.stock_quantity), 0)
    INTO total_stock
    FROM public.size_variants sv
    JOIN public.color_variants cv ON sv.color_variant_id = cv.id
    WHERE cv.product_id = product_uuid;
  
  -- If product has only color variants, sum from color_variants
  ELSIF has_color_variants AND NOT has_size_variants THEN
    SELECT COALESCE(SUM(cv.stock_quantity), 0)
    INTO total_stock
    FROM public.color_variants cv
    WHERE cv.product_id = product_uuid;
  
  -- If product has no variants, get from products table
  ELSE
    SELECT COALESCE(p.stock_quantity, 0)
    INTO total_stock
    FROM public.products p
    WHERE p.id = product_uuid;
  END IF;
  
  RETURN total_stock;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.calculate_product_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_product_stock(UUID) TO anon;
