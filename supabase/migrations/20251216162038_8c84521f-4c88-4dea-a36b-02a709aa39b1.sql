-- Enable RLS on notices table
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Create policies for notices
CREATE POLICY "Anyone can view active notices" 
ON public.notices 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage notices" 
ON public.notices 
FOR ALL 
USING (is_admin());

-- Enable RLS on top_bar_text table
ALTER TABLE public.top_bar_text ENABLE ROW LEVEL SECURITY;

-- Create policies for top_bar_text
CREATE POLICY "Anyone can view active top bar text" 
ON public.top_bar_text 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage top bar text" 
ON public.top_bar_text 
FOR ALL 
USING (is_admin());

-- Fix remaining function search_path issues
-- Fix safe_update_stock
CREATE OR REPLACE FUNCTION public.safe_update_stock(p_product_id uuid, p_stock_change integer, p_color_variant_id uuid DEFAULT NULL::uuid, p_size_variant_id uuid DEFAULT NULL::uuid, p_reservation_change integer DEFAULT 0, p_reason text DEFAULT NULL::text, p_order_id uuid DEFAULT NULL::uuid, p_order_number text DEFAULT NULL::text, p_transaction_type text DEFAULT 'adjust'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    v_inventory_id uuid;
    v_current_stock integer;
    v_current_reserved integer;
    v_new_stock integer;
    v_new_reserved integer;
    v_safe_reservation_change integer;
BEGIN
    RAISE LOG 'safe_update_stock called: product_id=%, stock_change=%, reservation_change=%, reason=%', 
        p_product_id, p_stock_change, p_reservation_change, p_reason;

    SELECT id, stock_quantity, reserved_stock
    INTO v_inventory_id, v_current_stock, v_current_reserved
    FROM product_inventory
    WHERE product_id = p_product_id
      AND (color_variant_id = p_color_variant_id OR (color_variant_id IS NULL AND p_color_variant_id IS NULL))
      AND (size_variant_id = p_size_variant_id OR (size_variant_id IS NULL AND p_size_variant_id IS NULL));
    
    IF v_inventory_id IS NULL THEN
        RAISE EXCEPTION 'Inventory record not found for product variant';
    END IF;
    
    RAISE LOG 'Current inventory state: stock=%, reserved=%', v_current_stock, v_current_reserved;
    
    v_new_stock := v_current_stock + p_stock_change;
    
    IF p_reservation_change < 0 THEN
        v_safe_reservation_change := GREATEST(p_reservation_change, -v_current_reserved);
    ELSE
        v_safe_reservation_change := LEAST(p_reservation_change, v_new_stock - v_current_reserved);
    END IF;
    
    v_new_reserved := v_current_reserved + v_safe_reservation_change;
    
    RAISE LOG 'Calculated new values: stock=%, reserved=%, safe_reservation_change=%', 
        v_new_stock, v_new_reserved, v_safe_reservation_change;
    
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative. Current: %, Change: %, New: %', 
            v_current_stock, p_stock_change, v_new_stock;
    END IF;
    
    IF v_new_reserved < 0 THEN
        RAISE WARNING 'Attempted to set reserved stock to negative. Current: %, Change: %, Adjusted to: 0', 
            v_current_reserved, p_reservation_change;
        v_new_reserved := 0;
    END IF;
    
    IF v_new_reserved > v_new_stock THEN
        RAISE WARNING 'Reserved stock would exceed total stock. Stock: %, Reserved: %, Adjusting reserved to match stock', 
            v_new_stock, v_new_reserved;
        v_new_reserved := v_new_stock;
    END IF;
    
    UPDATE product_inventory
    SET 
        stock_quantity = v_new_stock,
        reserved_stock = v_new_reserved,
        updated_at = now()
    WHERE id = v_inventory_id;
    
    INSERT INTO inventory_transactions (
        inventory_id,
        transaction_type,
        quantity_change,
        order_id,
        order_number,
        reason,
        previous_stock,
        previous_reserved,
        new_stock,
        new_reserved,
        created_by
    ) VALUES (
        v_inventory_id,
        p_transaction_type,
        p_stock_change,
        p_order_id,
        p_order_number,
        p_reason || ' (Safe reservation change: ' || v_safe_reservation_change || ')',
        v_current_stock,
        v_current_reserved,
        v_new_stock,
        v_new_reserved,
        auth.uid()
    );
    
    RAISE LOG 'Successfully updated inventory: stock % -> %, reserved % -> %', 
        v_current_stock, v_new_stock, v_current_reserved, v_new_reserved;
    
    RETURN true;
END;
$function$;

-- Fix handle_new_user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer',
    now(),
    now()
  );
  return new;
end;
$function$;