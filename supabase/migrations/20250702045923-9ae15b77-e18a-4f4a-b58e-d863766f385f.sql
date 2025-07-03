
-- Phase 1: Database Integrity - Create comprehensive RPC functions for stock management

-- Function to get the correct stock source and amount for any product variant combination
CREATE OR REPLACE FUNCTION public.get_variant_stock_info(
  p_product_id UUID,
  p_color_variant_id UUID DEFAULT NULL,
  p_size_variant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  stock_source TEXT,
  stock_amount INTEGER,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_product RECORD;
  v_color RECORD;
  v_size RECORD;
BEGIN
  -- Get product info
  SELECT has_color_variants, has_size_variants, stock_quantity, status, name
  INTO v_product
  FROM public.products
  WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, FALSE, 'Product not found';
    RETURN;
  END IF;
  
  IF v_product.status != 'active' THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, FALSE, 'Product is inactive';
    RETURN;
  END IF;
  
  -- Case 1: No color variants - use product stock
  IF NOT v_product.has_color_variants THEN
    RETURN QUERY SELECT 
      'product'::TEXT, 
      COALESCE(v_product.stock_quantity, 0), 
      TRUE, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Case 2: Has color variants - need color variant ID
  IF p_color_variant_id IS NULL THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, FALSE, 'Color variant required';
    RETURN;
  END IF;
  
  -- Get color variant info
  SELECT color_name, has_sizes, stock_quantity
  INTO v_color
  FROM public.color_variants
  WHERE id = p_color_variant_id AND product_id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, FALSE, 'Color variant not found';
    RETURN;
  END IF;
  
  -- Case 2A: Color has no sizes - use color stock
  IF NOT v_color.has_sizes THEN
    RETURN QUERY SELECT 
      'color'::TEXT, 
      COALESCE(v_color.stock_quantity, 0), 
      TRUE, 
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Case 2B: Color has sizes - need size variant ID
  IF p_size_variant_id IS NULL THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, FALSE, 'Size variant required';
    RETURN;
  END IF;
  
  -- Get size variant info
  SELECT size_name, stock_quantity
  INTO v_size
  FROM public.size_variants
  WHERE id = p_size_variant_id AND color_variant_id = p_color_variant_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::TEXT, 0, FALSE, 'Size variant not found';
    RETURN;
  END IF;
  
  -- Return size variant stock
  RETURN QUERY SELECT 
    'size'::TEXT, 
    COALESCE(v_size.stock_quantity, 0), 
    TRUE, 
    NULL::TEXT;
END;
$$;

-- Function to update stock atomically with proper validation
CREATE OR REPLACE FUNCTION public.update_variant_stock_atomic(
  p_product_id UUID,
  p_color_variant_id UUID DEFAULT NULL,
  p_size_variant_id UUID DEFAULT NULL,
  p_stock_change INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  new_stock INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock_info RECORD;
  v_new_stock INTEGER;
BEGIN
  -- Get current stock info
  SELECT * INTO v_stock_info
  FROM public.get_variant_stock_info(p_product_id, p_color_variant_id, p_size_variant_id);
  
  IF NOT v_stock_info.is_valid THEN
    RETURN QUERY SELECT FALSE, 0, v_stock_info.error_message;
    RETURN;
  END IF;
  
  -- Calculate new stock amount
  v_new_stock := v_stock_info.stock_amount + p_stock_change;
  
  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    RETURN QUERY SELECT FALSE, v_stock_info.stock_amount, 'Insufficient stock available';
    RETURN;
  END IF;
  
  -- Update the appropriate table based on stock source
  CASE v_stock_info.stock_source
    WHEN 'product' THEN
      UPDATE public.products 
      SET stock_quantity = v_new_stock 
      WHERE id = p_product_id;
      
    WHEN 'color' THEN
      UPDATE public.color_variants 
      SET stock_quantity = v_new_stock 
      WHERE id = p_color_variant_id;
      
    WHEN 'size' THEN
      UPDATE public.size_variants 
      SET stock_quantity = v_new_stock 
      WHERE id = p_size_variant_id;
  END CASE;
  
  RETURN QUERY SELECT TRUE, v_new_stock, NULL::TEXT;
END;
$$;

-- Function to validate multiple items atomically (for cart validation)
CREATE OR REPLACE FUNCTION public.validate_cart_stock(
  p_items JSONB
)
RETURNS TABLE (
  is_valid BOOLEAN,
  invalid_items JSONB,
  error_messages TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_item JSONB;
  v_stock_info RECORD;
  v_invalid_items JSONB := '[]'::JSONB;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_all_valid BOOLEAN := TRUE;
BEGIN
  -- Loop through each item in the cart
  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items)
  LOOP
    -- Get stock info for this item
    SELECT * INTO v_stock_info
    FROM public.get_variant_stock_info(
      (v_item->>'productId')::UUID,
      CASE WHEN v_item->>'colorVariantId' = 'null' OR v_item->>'colorVariantId' IS NULL 
           THEN NULL 
           ELSE (v_item->>'colorVariantId')::UUID END,
      CASE WHEN v_item->>'sizeVariantId' = 'null' OR v_item->>'sizeVariantId' IS NULL 
           THEN NULL 
           ELSE (v_item->>'sizeVariantId')::UUID END
    );
    
    -- Check if item is valid and has sufficient stock
    IF NOT v_stock_info.is_valid OR 
       v_stock_info.stock_amount < (v_item->>'quantity')::INTEGER THEN
      
      v_all_valid := FALSE;
      v_invalid_items := v_invalid_items || v_item;
      
      IF NOT v_stock_info.is_valid THEN
        v_errors := v_errors || v_stock_info.error_message;
      ELSE
        v_errors := v_errors || 
          (v_item->>'productName' || ': Only ' || v_stock_info.stock_amount || ' available, requested ' || (v_item->>'quantity')::TEXT);
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_all_valid, v_invalid_items, v_errors;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_variant_stock_info(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_variant_stock_info(UUID, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.update_variant_stock_atomic(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_variant_stock_atomic(UUID, UUID, UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_cart_stock(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_cart_stock(JSONB) TO anon;
