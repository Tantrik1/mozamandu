-- Fix inventory management functions to handle stock properly

-- Drop and recreate the fulfill_order_stock_enhanced function with better logic
DROP FUNCTION IF EXISTS public.fulfill_order_stock_enhanced(uuid);

CREATE OR REPLACE FUNCTION public.fulfill_order_stock_enhanced(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
    v_current_reserved integer;
    v_actual_release_qty integer;
BEGIN
    RAISE LOG 'Starting fulfill_order_stock_enhanced for order: %', p_order_id;
    
    -- Loop through all items in the customer order
    FOR order_item IN
        SELECT 
            coid.product_inventory_id,
            coid.sku,
            coid.quantity,
            co.order_number,
            coid.product_name,
            coid.color_name,
            coid.size_name
        FROM customer_order_item_details coid
        JOIN customer_orders co ON coid.order_id = co.id
        WHERE coid.order_id = p_order_id
    LOOP
        BEGIN
            RAISE LOG 'Processing fulfill for SKU: %, Quantity: %', order_item.sku, order_item.quantity;
            
            -- Get current inventory state
            SELECT id, reserved_stock INTO v_inventory_id, v_current_reserved
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NOT NULL THEN
                -- Calculate actual release quantity (don't release more than what's reserved)
                v_actual_release_qty := LEAST(order_item.quantity, v_current_reserved);
                
                RAISE LOG 'Current reserved: %, Requested: %, Actual release: %', 
                    v_current_reserved, order_item.quantity, v_actual_release_qty;
                
                IF v_actual_release_qty > 0 THEN
                    -- Fulfill stock (reduce both total and reserved by actual amount)
                    PERFORM safe_update_stock(
                        (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                        -v_actual_release_qty, -- decrease total stock
                        (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        -v_actual_release_qty, -- decrease reserved stock
                        'Order fulfillment (delivered) - SKU: ' || order_item.sku || ' - Released: ' || v_actual_release_qty,
                        p_order_id,
                        order_item.order_number,
                        'fulfill'
                    );
                    
                    RAISE LOG 'Successfully fulfilled % units for SKU: %', v_actual_release_qty, order_item.sku;
                ELSE
                    RAISE LOG 'No reserved stock to fulfill for SKU: %', order_item.sku;
                END IF;
            ELSE
                RAISE LOG 'Inventory record not found for SKU: %', order_item.sku;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE WARNING 'Failed to fulfill stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'Completed fulfill_order_stock_enhanced for order: %, Success: %', p_order_id, v_success;
    RETURN v_success;
END;
$function$;

-- Drop and recreate the release_order_stock_enhanced function with better logic
DROP FUNCTION IF EXISTS public.release_order_stock_enhanced(uuid);

CREATE OR REPLACE FUNCTION public.release_order_stock_enhanced(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
    order_item record;
    v_success boolean := true;
    v_inventory_id uuid;
    v_current_reserved integer;
    v_actual_release_qty integer;
BEGIN
    RAISE LOG 'Starting release_order_stock_enhanced for order: %', p_order_id;
    
    -- Loop through all items in the customer order
    FOR order_item IN
        SELECT 
            coid.product_inventory_id,
            coid.sku,
            coid.quantity,
            co.order_number,
            coid.product_name,
            coid.color_name,
            coid.size_name
        FROM customer_order_item_details coid
        JOIN customer_orders co ON coid.order_id = co.id
        WHERE coid.order_id = p_order_id
    LOOP
        BEGIN
            RAISE LOG 'Processing release for SKU: %, Quantity: %', order_item.sku, order_item.quantity;
            
            -- Get current inventory state
            SELECT id, reserved_stock INTO v_inventory_id, v_current_reserved
            FROM product_inventory 
            WHERE id = order_item.product_inventory_id;
            
            IF v_inventory_id IS NOT NULL THEN
                -- Calculate actual release quantity (don't release more than what's reserved)
                v_actual_release_qty := LEAST(order_item.quantity, v_current_reserved);
                
                RAISE LOG 'Current reserved: %, Requested: %, Actual release: %', 
                    v_current_reserved, order_item.quantity, v_actual_release_qty;
                
                IF v_actual_release_qty > 0 THEN
                    -- Release reserved stock (only decrease reserved, keep total stock)
                    PERFORM safe_update_stock(
                        (SELECT product_id FROM product_inventory WHERE id = v_inventory_id),
                        0, -- no change to total stock
                        (SELECT color_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        (SELECT size_variant_id FROM product_inventory WHERE id = v_inventory_id),
                        -v_actual_release_qty, -- decrease reserved stock
                        'Order stock release (cancelled) - SKU: ' || order_item.sku || ' - Released: ' || v_actual_release_qty,
                        p_order_id,
                        order_item.order_number,
                        'release'
                    );
                    
                    RAISE LOG 'Successfully released % units for SKU: %', v_actual_release_qty, order_item.sku;
                ELSE
                    RAISE LOG 'No reserved stock to release for SKU: %', order_item.sku;
                END IF;
            ELSE
                RAISE LOG 'Inventory record not found for SKU: %', order_item.sku;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                v_success := false;
                RAISE WARNING 'Failed to release stock for SKU %: %', order_item.sku, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'Completed release_order_stock_enhanced for order: %, Success: %', p_order_id, v_success;
    RETURN v_success;
END;
$function$;

-- Update the safe_update_stock function to handle edge cases better
DROP FUNCTION IF EXISTS public.safe_update_stock(uuid, integer, uuid, uuid, integer, text, uuid, text, text);

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
        -- When increasing reservations, use the full amount
        v_safe_reservation_change := p_reservation_change;
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
    
    -- Update inventory
    UPDATE product_inventory
    SET 
        stock_quantity = v_new_stock,
        reserved_stock = v_new_reserved,
        available_stock = v_new_stock - v_new_reserved,
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