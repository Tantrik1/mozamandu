
-- Create the new inventory management table
CREATE TABLE public.product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  
  -- Variant Information
  color_variant_id UUID REFERENCES public.color_variants(id) ON DELETE CASCADE,
  size_variant_id UUID REFERENCES public.size_variants(id) ON DELETE CASCADE,
  
  -- Product Details (denormalized for performance)
  product_name TEXT NOT NULL,
  color_name TEXT,
  size_name TEXT,
  size_code TEXT,
  
  -- Stock Management
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER GENERATED ALWAYS AS (stock_quantity - reserved_stock) STORED,
  
  -- Pricing
  cost_price NUMERIC,
  selling_price NUMERIC,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_product_inventory_product_id ON public.product_inventory(product_id);
CREATE INDEX idx_product_inventory_sku ON public.product_inventory(sku);
CREATE INDEX idx_product_inventory_color_variant ON public.product_inventory(color_variant_id);
CREATE INDEX idx_product_inventory_size_variant ON public.product_inventory(size_variant_id);
CREATE INDEX idx_product_inventory_available_stock ON public.product_inventory(available_stock);

-- Enable RLS
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage product inventory"
  ON public.product_inventory
  FOR ALL
  USING (is_admin());

CREATE POLICY "Anyone can view active product inventory"
  ON public.product_inventory
  FOR SELECT
  USING (is_active = true);

-- Function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_product_sku(
  p_product_name TEXT,
  p_color_name TEXT DEFAULT NULL,
  p_size_name TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_sku TEXT;
  counter INTEGER := 1;
  final_sku TEXT;
BEGIN
  -- Create base SKU
  base_sku := UPPER(REGEXP_REPLACE(p_product_name, '[^A-Za-z0-9]', '_', 'g'));
  
  -- Add color if present
  IF p_color_name IS NOT NULL THEN
    base_sku := base_sku || '_' || UPPER(REGEXP_REPLACE(p_color_name, '[^A-Za-z0-9]', '_', 'g'));
  END IF;
  
  -- Add size if present
  IF p_size_name IS NOT NULL THEN
    base_sku := base_sku || '_' || UPPER(REGEXP_REPLACE(p_size_name, '[^A-Za-z0-9]', '_', 'g'));
  END IF;
  
  -- Ensure uniqueness
  final_sku := base_sku;
  WHILE EXISTS (SELECT 1 FROM public.product_inventory WHERE sku = final_sku) LOOP
    final_sku := base_sku || '_' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_sku;
END;
$$;

-- Function to populate inventory from existing data
CREATE OR REPLACE FUNCTION public.migrate_to_product_inventory()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  product_record RECORD;
  color_record RECORD;
  size_record RECORD;
  inventory_sku TEXT;
BEGIN
  -- Clear existing inventory data
  DELETE FROM public.product_inventory;
  
  -- Loop through all products
  FOR product_record IN 
    SELECT id, name, cost_price, selling_price, stock_quantity, has_color_variants, color_has_size_variants
    FROM public.products 
    WHERE status = 'active'
  LOOP
    
    IF NOT product_record.has_color_variants THEN
      -- Simple product without variants
      inventory_sku := generate_product_sku(product_record.name);
      INSERT INTO public.product_inventory (
        product_id, sku, product_name, stock_quantity, cost_price, selling_price
      ) VALUES (
        product_record.id, inventory_sku, product_record.name, 
        COALESCE(product_record.stock_quantity, 0), 
        product_record.cost_price, product_record.selling_price
      );
      
    ELSE
      -- Product has color variants
      FOR color_record IN 
        SELECT id, color_name, stock_quantity, has_sizes, image_url
        FROM public.color_variants 
        WHERE product_id = product_record.id
      LOOP
        
        IF NOT color_record.has_sizes THEN
          -- Color variant without sizes
          inventory_sku := generate_product_sku(product_record.name, color_record.color_name);
          INSERT INTO public.product_inventory (
            product_id, color_variant_id, sku, product_name, color_name, 
            stock_quantity, cost_price, selling_price
          ) VALUES (
            product_record.id, color_record.id, inventory_sku, 
            product_record.name, color_record.color_name,
            COALESCE(color_record.stock_quantity, 0),
            product_record.cost_price, product_record.selling_price
          );
          
        ELSE
          -- Color variant with sizes
          FOR size_record IN 
            SELECT id, size_name, size_code, stock_quantity
            FROM public.size_variants 
            WHERE color_variant_id = color_record.id
          LOOP
            inventory_sku := generate_product_sku(product_record.name, color_record.color_name, size_record.size_name);
            INSERT INTO public.product_inventory (
              product_id, color_variant_id, size_variant_id, sku, 
              product_name, color_name, size_name, size_code,
              stock_quantity, cost_price, selling_price
            ) VALUES (
              product_record.id, color_record.id, size_record.id, inventory_sku,
              product_record.name, color_record.color_name, size_record.size_name, size_record.size_code,
              COALESCE(size_record.stock_quantity, 0),
              product_record.cost_price, product_record.selling_price
            );
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN 'Migration completed successfully. Total inventory items: ' || (SELECT COUNT(*) FROM public.product_inventory);
END;
$$;

-- Function to get product stock summary from inventory
CREATE OR REPLACE FUNCTION public.get_product_inventory_summary(product_uuid UUID)
RETURNS TABLE (
  total_stock INTEGER,
  available_stock INTEGER,
  reserved_stock INTEGER,
  variant_count INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(pi.stock_quantity), 0)::INTEGER as total_stock,
    COALESCE(SUM(pi.available_stock), 0)::INTEGER as available_stock,
    COALESCE(SUM(pi.reserved_stock), 0)::INTEGER as reserved_stock,
    COUNT(*)::INTEGER as variant_count
  FROM public.product_inventory pi
  WHERE pi.product_id = product_uuid AND pi.is_active = true;
END;
$$;

-- Update stock function for inventory
CREATE OR REPLACE FUNCTION public.update_inventory_stock(
  inventory_id UUID,
  stock_change INTEGER,
  operation_type TEXT DEFAULT 'adjust'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF operation_type = 'reserve' THEN
    UPDATE public.product_inventory 
    SET reserved_stock = GREATEST(0, reserved_stock + stock_change),
        updated_at = now()
    WHERE id = inventory_id;
  ELSE
    UPDATE public.product_inventory 
    SET stock_quantity = GREATEST(0, stock_quantity + stock_change),
        updated_at = now()
    WHERE id = inventory_id;
  END IF;
  
  RETURN FOUND;
END;
$$;
