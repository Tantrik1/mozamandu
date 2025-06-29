
-- Create RPC functions for stock management
CREATE OR REPLACE FUNCTION public.update_product_stock(
  product_id UUID,
  stock_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(0, stock_quantity + stock_change)
  WHERE id = product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_color_variant_stock(
  variant_id UUID,
  stock_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.color_variants 
  SET stock_quantity = GREATEST(0, stock_quantity + stock_change)
  WHERE id = variant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_size_variant_stock(
  variant_id UUID,
  stock_change INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.size_variants 
  SET stock_quantity = GREATEST(0, stock_quantity + stock_change)
  WHERE id = variant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_product_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_color_variant_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_size_variant_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_product_stock(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.update_color_variant_stock(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.update_size_variant_stock(UUID, INTEGER) TO anon;
