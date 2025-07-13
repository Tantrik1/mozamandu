-- Fix the safe_update_stock function to not update available_stock since it's a generated column
CREATE OR REPLACE FUNCTION public.safe_update_stock(
    p_product_id uuid,
    p_stock_change integer,
    p_color_variant_id uuid DEFAULT NULL::uuid,
    p_size_variant_id uuid DEFAULT NULL::uuid,
    p_reservation_change integer DEFAULT 0,
    p_reason text DEFAULT NULL::text,
    p_order_id uuid DEFAULT NULL::uuid,
    p_order_number text DEFAULT NULL::text,
    p_transaction_type text DEFAULT 'adjust'::text
)
RETURNS boolean
LANGUAGE plpgsql
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

    -- Find the inventory record
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
    
    -- Calculate new values
    v_new_stock := v_current_stock + p_stock_change;
    
    -- Handle reservation changes more safely
    IF p_reservation_change < 0 THEN
        -- When reducing reservations, don't reduce more than what's currently reserved
        v_safe_reservation_change := GREATEST(p_reservation_change, -v_current_reserved);
    ELSE
        -- When increasing reservations, don't exceed available stock
        v_safe_reservation_change := LEAST(p_reservation_change, v_new_stock - v_current_reserved);
    END IF;
    
    v_new_reserved := v_current_reserved + v_safe_reservation_change;
    
    RAISE LOG 'Calculated new values: stock=%, reserved=%, safe_reservation_change=%', 
        v_new_stock, v_new_reserved, v_safe_reservation_change;
    
    -- Validate constraints
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
    
    -- Update inventory (DO NOT update available_stock as it's a generated column)
    UPDATE product_inventory
    SET 
        stock_quantity = v_new_stock,
        reserved_stock = v_new_reserved,
        updated_at = now()
    WHERE id = v_inventory_id;
    
    -- Log transaction
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