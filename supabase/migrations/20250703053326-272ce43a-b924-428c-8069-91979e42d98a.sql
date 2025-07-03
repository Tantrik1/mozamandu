
-- Remove duplicate foreign key constraints
ALTER TABLE public.color_variants 
DROP CONSTRAINT IF EXISTS color_variants_product_id_fkey;

-- Add unique constraints to prevent duplicate color names per product
ALTER TABLE public.color_variants
ADD CONSTRAINT uq_color_variants_product_color
UNIQUE (product_id, color_name);

-- Add unique constraints to prevent duplicate size names per color variant
ALTER TABLE public.size_variants
ADD CONSTRAINT uq_size_variants_color_size
UNIQUE (color_variant_id, size_name);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_color_variants_color_name ON public.color_variants USING btree (color_name);
CREATE INDEX IF NOT EXISTS idx_size_variants_size_name ON public.size_variants USING btree (size_name);
CREATE INDEX IF NOT EXISTS idx_size_variants_size_code ON public.size_variants USING btree (size_code) WHERE size_code IS NOT NULL;

-- Create function to update color variant stock when size variants change
CREATE OR REPLACE FUNCTION update_color_variant_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different trigger events
  IF TG_OP = 'DELETE' THEN
    -- Update parent color variant stock after deletion
    UPDATE color_variants
    SET stock_quantity = (
      SELECT COALESCE(SUM(stock_quantity), 0)
      FROM size_variants
      WHERE color_variant_id = OLD.color_variant_id
    )
    WHERE id = OLD.color_variant_id;
    
    RETURN OLD;
  ELSE
    -- Update parent color variant stock after insert/update
    UPDATE color_variants
    SET stock_quantity = (
      SELECT COALESCE(SUM(stock_quantity), 0)
      FROM size_variants
      WHERE color_variant_id = NEW.color_variant_id
    )
    WHERE id = NEW.color_variant_id;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for size variant changes
DROP TRIGGER IF EXISTS trigger_update_color_variant_stock ON size_variants;
CREATE TRIGGER trigger_update_color_variant_stock
AFTER INSERT OR UPDATE OR DELETE ON size_variants
FOR EACH ROW EXECUTE FUNCTION update_color_variant_stock();

-- Create function to update product stock when color variants change
CREATE OR REPLACE FUNCTION update_product_stock_from_color()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different trigger events
  IF TG_OP = 'DELETE' THEN
    -- Update product stock after color variant deletion
    UPDATE products
    SET stock_quantity = (
      SELECT COALESCE(SUM(stock_quantity), 0)
      FROM color_variants
      WHERE product_id = OLD.product_id
    )
    WHERE id = OLD.product_id;
    
    RETURN OLD;
  ELSE
    -- Update product stock after color variant insert/update
    UPDATE products
    SET stock_quantity = (
      SELECT COALESCE(SUM(stock_quantity), 0)
      FROM color_variants
      WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for color variant changes
DROP TRIGGER IF EXISTS trigger_update_product_stock_from_color ON color_variants;
CREATE TRIGGER trigger_update_product_stock_from_color
AFTER INSERT OR UPDATE OR DELETE ON color_variants
FOR EACH ROW EXECUTE FUNCTION update_product_stock_from_color();

-- Create a view for easier variant queries
CREATE OR REPLACE VIEW product_variants_summary AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.has_color_variants,
  p.color_has_size_variants,
  c.id AS color_variant_id,
  c.color_name,
  c.has_sizes,
  s.id AS size_variant_id,
  s.size_name,
  s.size_code,
  CASE 
    WHEN s.id IS NOT NULL THEN s.stock_quantity
    WHEN c.id IS NOT NULL AND NOT c.has_sizes THEN c.stock_quantity
    ELSE p.stock_quantity
  END AS variant_stock_quantity,
  c.stock_quantity AS color_total_stock,
  p.stock_quantity AS product_total_stock
FROM products p
LEFT JOIN color_variants c ON p.id = c.product_id
LEFT JOIN size_variants s ON c.id = s.color_variant_id AND c.has_sizes = true;

-- Update the existing RPC functions to handle the improved schema better
CREATE OR REPLACE FUNCTION get_variant_stock_info(
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
  v_product_record RECORD;
  v_color_record RECORD;
  v_size_record RECORD;
  v_stock_amount INTEGER := 0;
  v_stock_source TEXT := 'none';
  v_is_valid BOOLEAN := false;
  v_error_message TEXT := NULL;
BEGIN
  -- Get product information
  SELECT * INTO v_product_record
  FROM products
  WHERE id = p_product_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, false, 'Product not found or inactive'::TEXT;
    RETURN;
  END IF;
  
  -- Handle size variant case (most specific)
  IF p_size_variant_id IS NOT NULL THEN
    SELECT sv.*, cv.product_id INTO v_size_record
    FROM size_variants sv
    JOIN color_variants cv ON sv.color_variant_id = cv.id
    WHERE sv.id = p_size_variant_id 
    AND cv.product_id = p_product_id;
    
    IF FOUND THEN
      v_stock_source := 'size_variant';
      v_stock_amount := v_size_record.stock_quantity;
      v_is_valid := true;
    ELSE
      v_error_message := 'Size variant not found for this product';
    END IF;
    
  -- Handle color variant case (no size specified)
  ELSIF p_color_variant_id IS NOT NULL THEN
    SELECT * INTO v_color_record
    FROM color_variants
    WHERE id = p_color_variant_id 
    AND product_id = p_product_id;
    
    IF FOUND THEN
      -- If color has sizes but no size specified, return error
      IF v_color_record.has_sizes THEN
        v_error_message := 'Color variant has sizes - size must be specified';
      ELSE
        v_stock_source := 'color_variant';
        v_stock_amount := v_color_record.stock_quantity;
        v_is_valid := true;
      END IF;
    ELSE
      v_error_message := 'Color variant not found for this product';
    END IF;
    
  -- Handle product-level stock (no variants specified)
  ELSE
    -- Check if product has color variants
    IF v_product_record.has_color_variants THEN
      v_error_message := 'Product has color variants - color must be specified';
    ELSE
      v_stock_source := 'product';
      v_stock_amount := v_product_record.stock_quantity;
      v_is_valid := true;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_stock_source, v_stock_amount, v_is_valid, v_error_message;
END;
$$;

-- Improved atomic stock update function
CREATE OR REPLACE FUNCTION update_variant_stock_atomic(
  p_product_id UUID,
  p_color_variant_id UUID DEFAULT NULL,
  p_size_variant_id UUID DEFAULT NULL,
  p_stock_change INTEGER DEFAULT 0
)
RETURNS TABLE(
  success BOOLEAN,
  new_stock INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock INTEGER := 0;
  v_new_stock INTEGER := 0;
  v_updated_rows INTEGER := 0;
BEGIN
  -- Handle size variant updates
  IF p_size_variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO v_current_stock
    FROM size_variants sv
    JOIN color_variants cv ON sv.color_variant_id = cv.id
    WHERE sv.id = p_size_variant_id 
    AND cv.product_id = p_product_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'Size variant not found'::TEXT;
      RETURN;
    END IF;
    
    v_new_stock := GREATEST(0, v_current_stock + p_stock_change);
    
    UPDATE size_variants 
    SET stock_quantity = v_new_stock
    WHERE id = p_size_variant_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
  -- Handle color variant updates
  ELSIF p_color_variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO v_current_stock
    FROM color_variants
    WHERE id = p_color_variant_id 
    AND product_id = p_product_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'Color variant not found'::TEXT;
      RETURN;
    END IF;
    
    v_new_stock := GREATEST(0, v_current_stock + p_stock_change);
    
    UPDATE color_variants 
    SET stock_quantity = v_new_stock
    WHERE id = p_color_variant_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
  -- Handle product-level updates
  ELSE
    SELECT stock_quantity INTO v_current_stock
    FROM products
    WHERE id = p_product_id;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'Product not found'::TEXT;
      RETURN;
    END IF;
    
    v_new_stock := GREATEST(0, v_current_stock + p_stock_change);
    
    UPDATE products 
    SET stock_quantity = v_new_stock
    WHERE id = p_product_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  END IF;
  
  IF v_updated_rows > 0 THEN
    RETURN QUERY SELECT true, v_new_stock, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT false, v_current_stock, 'Failed to update stock'::TEXT;
  END IF;
END;
$$;
