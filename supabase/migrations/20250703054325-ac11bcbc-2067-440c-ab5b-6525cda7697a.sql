
-- First, let's handle the duplicate entries that are causing the unique constraint error
-- Remove duplicates in color_variants table
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY product_id, color_name ORDER BY created_at) as rn
  FROM color_variants
)
DELETE FROM color_variants 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Remove duplicates in size_variants table if any
WITH size_duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY color_variant_id, size_name ORDER BY created_at) as rn
  FROM size_variants
)
DELETE FROM size_variants 
WHERE id IN (
  SELECT id FROM size_duplicates WHERE rn > 1
);

-- Now add the unique constraints safely
ALTER TABLE public.color_variants
ADD CONSTRAINT uq_color_variants_product_color
UNIQUE (product_id, color_name);

ALTER TABLE public.size_variants
ADD CONSTRAINT uq_size_variants_color_size
UNIQUE (color_variant_id, size_name);

-- Create the comprehensive product variants breakdown table you requested
-- This will create individual rows for every possible variant combination
CREATE TABLE IF NOT EXISTS public.product_variants_breakdown (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  color_variant_id UUID,
  color_name TEXT,
  size_variant_id UUID,
  size_name TEXT,
  size_code TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  variant_sku TEXT, -- SKU for this specific variant
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_variants_breakdown_product_id 
ON public.product_variants_breakdown (product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_breakdown_color_variant 
ON public.product_variants_breakdown (color_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_breakdown_size_variant 
ON public.product_variants_breakdown (size_variant_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_breakdown_sku 
ON public.product_variants_breakdown (variant_sku);

-- Enable RLS
ALTER TABLE public.product_variants_breakdown ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Admins can manage product variants breakdown" 
ON public.product_variants_breakdown 
FOR ALL 
USING (is_admin());

CREATE POLICY "Anyone can view product variants breakdown" 
ON public.product_variants_breakdown 
FOR SELECT 
USING (is_active = true);

-- Function to generate variant breakdown entries
CREATE OR REPLACE FUNCTION generate_product_variants_breakdown(p_product_id UUID)
RETURNS VOID AS $$
DECLARE
  product_record RECORD;
  color_record RECORD;
  size_record RECORD;
  variant_sku TEXT;
BEGIN
  -- Get product details
  SELECT * INTO product_record FROM products WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Clear existing breakdown entries for this product
  DELETE FROM product_variants_breakdown WHERE product_id = p_product_id;
  
  -- If product has no color variants, create single entry
  IF NOT product_record.has_color_variants THEN
    variant_sku := UPPER(REPLACE(product_record.name, ' ', '_')) || '_DEFAULT';
    
    INSERT INTO product_variants_breakdown (
      product_id, product_name, stock_quantity, variant_sku
    ) VALUES (
      p_product_id, 
      product_record.name, 
      COALESCE(product_record.stock_quantity, 0),
      variant_sku
    );
    
  ELSE
    -- Product has color variants
    FOR color_record IN 
      SELECT * FROM color_variants WHERE product_id = p_product_id
    LOOP
      -- If color has no sizes, create entry for color only
      IF NOT color_record.has_sizes THEN
        variant_sku := UPPER(REPLACE(product_record.name, ' ', '_')) || '_' || 
                       UPPER(REPLACE(color_record.color_name, ' ', '_'));
        
        INSERT INTO product_variants_breakdown (
          product_id, product_name, color_variant_id, color_name, 
          stock_quantity, variant_sku
        ) VALUES (
          p_product_id, 
          product_record.name,
          color_record.id,
          color_record.color_name,
          COALESCE(color_record.stock_quantity, 0),
          variant_sku
        );
        
      ELSE
        -- Color has sizes, create entry for each size
        FOR size_record IN 
          SELECT * FROM size_variants WHERE color_variant_id = color_record.id
        LOOP
          variant_sku := UPPER(REPLACE(product_record.name, ' ', '_')) || '_' || 
                         UPPER(REPLACE(color_record.color_name, ' ', '_')) || '_' ||
                         UPPER(REPLACE(size_record.size_name, ' ', '_'));
          
          INSERT INTO product_variants_breakdown (
            product_id, product_name, color_variant_id, color_name,
            size_variant_id, size_name, size_code, stock_quantity, variant_sku
          ) VALUES (
            p_product_id, 
            product_record.name,
            color_record.id,
            color_record.color_name,
            size_record.id,
            size_record.size_name,
            size_record.size_code,
            COALESCE(size_record.stock_quantity, 0),
            variant_sku
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to sync breakdown table when variants change
CREATE OR REPLACE FUNCTION sync_product_variants_breakdown()
RETURNS TRIGGER AS $$
DECLARE
  p_product_id UUID;
BEGIN
  -- Determine product_id based on trigger context
  IF TG_TABLE_NAME = 'products' THEN
    p_product_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'color_variants' THEN
    p_product_id := COALESCE(NEW.product_id, OLD.product_id);
  ELSIF TG_TABLE_NAME = 'size_variants' THEN
    SELECT cv.product_id INTO p_product_id 
    FROM color_variants cv 
    WHERE cv.id = COALESCE(NEW.color_variant_id, OLD.color_variant_id);
  END IF;
  
  -- Regenerate breakdown for this product
  PERFORM generate_product_variants_breakdown(p_product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-sync breakdown table
DROP TRIGGER IF EXISTS trigger_sync_breakdown_products ON products;
CREATE TRIGGER trigger_sync_breakdown_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION sync_product_variants_breakdown();

DROP TRIGGER IF EXISTS trigger_sync_breakdown_colors ON color_variants;
CREATE TRIGGER trigger_sync_breakdown_colors
  AFTER INSERT OR UPDATE OR DELETE ON color_variants
  FOR EACH ROW EXECUTE FUNCTION sync_product_variants_breakdown();

DROP TRIGGER IF EXISTS trigger_sync_breakdown_sizes ON size_variants;
CREATE TRIGGER trigger_sync_breakdown_sizes
  AFTER INSERT OR UPDATE OR DELETE ON size_variants
  FOR EACH ROW EXECUTE FUNCTION sync_product_variants_breakdown();

-- Generate breakdown for all existing products
DO $$
DECLARE
  product_id UUID;
BEGIN
  FOR product_id IN SELECT id FROM products LOOP
    PERFORM generate_product_variants_breakdown(product_id);
  END LOOP;
END;
$$;

-- Function to calculate total product stock from breakdown
CREATE OR REPLACE FUNCTION calculate_product_stock_from_breakdown(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_stock INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(stock_quantity), 0) 
  INTO total_stock
  FROM product_variants_breakdown 
  WHERE product_id = p_product_id AND is_active = true;
  
  RETURN total_stock;
END;
$$ LANGUAGE plpgsql;

-- Update the get_variant_stock_info function to use breakdown table
CREATE OR REPLACE FUNCTION get_variant_stock_info_v2(
  p_product_id UUID,
  p_color_variant_id UUID DEFAULT NULL,
  p_size_variant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  stock_source TEXT,
  stock_amount INTEGER,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_amount INTEGER := 0;
  v_stock_source TEXT := 'none';
  v_is_valid BOOLEAN := false;
  v_error_message TEXT := NULL;
  breakdown_record RECORD;
BEGIN
  -- Query the breakdown table for exact match
  SELECT * INTO breakdown_record
  FROM product_variants_breakdown
  WHERE product_id = p_product_id
    AND (color_variant_id = p_color_variant_id OR (color_variant_id IS NULL AND p_color_variant_id IS NULL))
    AND (size_variant_id = p_size_variant_id OR (size_variant_id IS NULL AND p_size_variant_id IS NULL))
    AND is_active = true;
  
  IF FOUND THEN
    v_stock_source := CASE 
      WHEN breakdown_record.size_variant_id IS NOT NULL THEN 'size_variant'
      WHEN breakdown_record.color_variant_id IS NOT NULL THEN 'color_variant'
      ELSE 'product'
    END;
    v_stock_amount := breakdown_record.stock_quantity;
    v_is_valid := true;
  ELSE
    v_error_message := 'Variant combination not found';
  END IF;
  
  RETURN QUERY SELECT v_stock_source, v_stock_amount, v_is_valid, v_error_message;
END;
$$;
